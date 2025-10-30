import os
from datetime import datetime, timedelta, timezone
import time
import traceback
import logging

from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient, DESCENDING
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from dotenv import load_dotenv
from bson import ObjectId

from ocr import image_paths_from_upload, ocr_text_from_paths
from parse import parse_fields
from compare import compare_docs
from export import generate_csv_from_records

# Logging
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s %(name)s: %(message)s')
logger = logging.getLogger('backend')

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/futurix')
JWT_SECRET = os.getenv('JWT_SECRET', 'dev-secret-change-me')
JWT_EXP_MIN = int(os.getenv('JWT_EXP_MIN', '60'))
UPLOAD_DIR = os.getenv('UPLOAD_DIR', os.path.join(os.path.dirname(__file__), 'uploads'))

os.makedirs(UPLOAD_DIR, exist_ok=True)

client = MongoClient(MONGO_URI)
db = client.get_default_database()
users = db['users']
verifications = db['verifications']
exports = db['exports']

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.getenv('CORS_ORIGIN', '*')}}, supports_credentials=True, allow_headers=["*"], methods=["GET","POST","OPTIONS"], expose_headers=["*"])


def create_token(user_id: str):
	now = datetime.now(timezone.utc)
	payload = {
		"sub": str(user_id),
		"exp": now + timedelta(minutes=JWT_EXP_MIN),
		"iat": now,
	}
	return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str):
	return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])  # raises on error


@app.post('/api/auth/signup')
def signup():
	try:
		data = request.get_json(force=True) or {}
		email = (data.get('email') or '').strip().lower()
		name = (data.get('name') or '').strip()
		password = data.get('password') or ''
		if not email or not password:
			return jsonify({"error": "email and password required"}), 400
		if users.find_one({"email": email}):
			return jsonify({"error": "email already registered"}), 409
		hash_ = generate_password_hash(password)
		res = users.insert_one({
			"email": email,
			"name": name,
			"password": hash_,
			"createdAt": datetime.now(timezone.utc),
		})
		token = create_token(res.inserted_id)
		logger.info("User signup: email=%s", email)
		return jsonify({"token": token, "user": {"id": str(res.inserted_id), "email": email, "name": name}}), 200
	except Exception as e:
		logger.exception("Signup error: %s", e)
		return jsonify({"error": "signup_failed"}), 500


@app.post('/api/auth/login')
def login():
	try:
		data = request.get_json(force=True) or {}
		email = (data.get('email') or '').strip().lower()
		password = data.get('password') or ''
		if not email or not password:
			return jsonify({"error": "email and password required"}), 400
		user = users.find_one({"email": email})
		if not user or not check_password_hash(user.get('password', ''), password):
			logger.warning("Login failed for email=%s", email)
			return jsonify({"error": "invalid credentials"}), 401
		token = create_token(user['_id'])
		logger.info("User login: email=%s", email)
		return jsonify({"token": token, "user": {"id": str(user['_id']), "email": user['email'], "name": user.get('name', '')}}), 200
	except Exception as e:
		logger.exception("Login error: %s", e)
		return jsonify({"error": "login_failed"}), 500


@app.get('/api/auth/me')
def me():
	try:
		auth = request.headers.get('Authorization', '')
		if not auth.startswith('Bearer '):
			return jsonify({"error": "missing token"}), 401
		token = auth.split(' ', 1)[1]
		try:
			payload = decode_token(token)
		except Exception as e:
			logger.warning("Token decode failed: %s", e)
			return jsonify({"error": "invalid token"}), 401
		user = users.find_one({"_id": ObjectId(payload['sub'])})
		if not user:
			return jsonify({"error": "user not found"}), 404
		return jsonify({"user": {"id": str(user['_id']), "email": user['email'], "name": user.get('name', '')}}), 200
	except Exception as e:
		logger.exception("Me endpoint error: %s", e)
		return jsonify({"error": "authentication_failed"}), 500


@app.post('/api/verify')
def verify():
	"""Accepts multipart/form-data with fields invoice and po. Returns extraction and comparison."""
	debug = request.args.get('debug') == '1'
	stage = {}
	try:
		stage['t0'] = time.perf_counter()
		if 'invoice' not in request.files or 'po' not in request.files:
			return jsonify({"error": "Both 'invoice' and 'po' files are required"}), 400

		invoice_file = request.files['invoice']
		po_file = request.files['po']
		logger.info("/verify received files invoice=%s po=%s", invoice_file.filename, po_file.filename)

		allowed = {'.pdf', '.png', '.jpg', '.jpeg', '.tif', '.tiff'}
		def _save(file):
			name = file.filename or 'upload'
			ext = os.path.splitext(name)[1].lower()
			if ext not in allowed:
				raise ValueError('Unsupported file type: ' + ext)
			path = os.path.join(UPLOAD_DIR, f"{datetime.now(timezone.utc).timestamp()}_{name}")
			file.save(path)
			return path

		inv_path = _save(invoice_file)
		po_path = _save(po_file)
		logger.info("Saved uploads to inv_path=%s po_path=%s", inv_path, po_path)
		stage['t_saved'] = time.perf_counter()

		inv_imgs = image_paths_from_upload(inv_path)
		po_imgs = image_paths_from_upload(po_path)
		logger.info("Image paths expanded inv=%s po=%s", inv_imgs, po_imgs)
		stage['t_images'] = time.perf_counter()

		inv_text = ocr_text_from_paths(inv_imgs)
		po_text = ocr_text_from_paths(po_imgs)
		logger.info("OCR text lens inv=%d po=%d", len(inv_text or ''), len(po_text or ''))
		# Log first few lines for quick inspection
		logger.info("OCR inv head: %s", (inv_text or '').splitlines()[:5])
		logger.info("OCR po head: %s", (po_text or '').splitlines()[:5])
		stage['t_ocr'] = time.perf_counter()

		inv_data = parse_fields(inv_text)
		po_data = parse_fields(po_text)
		logger.info("Parsed invoice fields: %s", {k: inv_data.get(k) for k in ['vendor','invoiceNo','orderId','date','total']})
		logger.info("Parsed PO fields: %s", {k: po_data.get(k) for k in ['vendor','invoiceNo','orderId','date','total']})
		stage['t_parse'] = time.perf_counter()

		# Heuristics from file names if fields missing
		import re as _re
		def _from_name(name: str, pats):
			for p in pats:
				m = _re.search(p, name, _re.I)
				if m:
					return m.group(1)
			return ''
		inv_name = invoice_file.filename or ''
		po_name = po_file.filename or ''
		if not inv_data.get('invoiceNo'):
			inv_data['invoiceNo'] = _from_name(inv_name, [r"inv(?:oice)?[_-]?([A-Za-z0-9-_/]+)", r"([A-Za-z]{2,}-?\d+)"])
		if not inv_data.get('orderId'):
			inv_data['orderId'] = _from_name(inv_name, [r"po[_-]?([A-Za-z0-9-_/]+)"])
		if not po_data.get('orderId'):
			po_data['orderId'] = _from_name(po_name, [r"po[_-]?([A-Za-z0-9-_/]+)", r"order[_-]?id[_-]?([A-Za-z0-9-_/]+)"])
		if not po_data.get('invoiceNo'):
			po_data['invoiceNo'] = _from_name(po_name, [r"inv(?:oice)?[_-]?([A-Za-z0-9-_/]+)"])

		result = compare_docs(inv_data, po_data)
		logger.info("Compare result: status=%s, discrepancies=%d", result.get('status'), len(result.get('discrepancies', [])))
		stage['t_compare'] = time.perf_counter()

		created = datetime.now(timezone.utc)
		doc = {
			"invoice": inv_data,
			"po": po_data,
			"result": result,
			"createdAt": created,
		}
		res = verifications.insert_one(doc)
		logger.info("Saved verification id=%s", res.inserted_id)
		stage['t_saved_db'] = time.perf_counter()

		payload = {
			"id": str(res.inserted_id),
			"invoice": inv_data,
			"po": po_data,
			"result": result,
			"createdAt": created.isoformat()
		}
		if debug:
			payload["debug"] = {
				"invoiceTextLen": len(inv_text or ''),
				"poTextLen": len(po_text or ''),
				"invoiceTextHead": '\n'.join((inv_text or '').splitlines()[:15]),
				"poTextHead": '\n'.join((po_text or '').splitlines()[:15]),
				"invoiceParsed": inv_data,
				"poParsed": po_data,
				"timingsMs": {
					"save": int((stage['t_saved']-stage['t0'])*1000),
					"images": int((stage['t_images']-stage['t_saved'])*1000),
					"ocr": int((stage['t_ocr']-stage['t_images'])*1000),
					"parse": int((stage['t_parse']-stage['t_ocr'])*1000),
					"compare": int((stage['t_compare']-stage['t_parse'])*1000),
					"db": int((stage['t_saved_db']-stage['t_compare'])*1000),
				},
			}
		return jsonify(payload)
	except Exception as e:
		logger.exception("/verify error: %s", e)
		if debug:
			return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500
		return jsonify({"error": "verification_failed"}), 500


@app.get('/api/stats')
def stats():
	matched = verifications.count_documents({"result.status": "matched"})
	partial = verifications.count_documents({"result.status": "partial"})
	mismatch = verifications.count_documents({"result.status": "mismatch"})
	pending = 0
	last_doc = verifications.find_one(sort=[("createdAt", DESCENDING)])
	last_export = last_doc.get('createdAt') if last_doc else None
	return jsonify({
		"matched": matched,
		"discrepancies": partial + mismatch,
		"pending": pending,
		"lastExport": last_export.isoformat() if last_export else None,
	})


@app.get('/api/records')
def records():
	limit = int(request.args.get('limit', '20'))
	items = []
	for d in verifications.find().sort("createdAt", DESCENDING).limit(limit):
		inv = d.get("invoice", {})
		po = d.get("po", {})
		items.append({
			"id": str(d["_id"]),
			"vendor": (inv.get("vendor") or po.get("vendor") or ""),
			"invoiceNo": inv.get("invoiceNo") or po.get("invoiceNo"),
			"orderId": inv.get("orderId") or po.get("orderId"),
			"invoiceDate": inv.get("date"),
			"amount": inv.get("total"),
			"status": d.get("result", {}).get("status"),
			"createdAt": d.get("createdAt").isoformat() if d.get("createdAt") else None,
		})
	return jsonify({"items": items})


@app.get('/api/records/<rid>')
def record_detail(rid: str):
	try:
		obj_id = ObjectId(rid)
	except Exception:
		return jsonify({"error": "invalid id"}), 400
	d = verifications.find_one({"_id": obj_id})
	if not d:
		return jsonify({"error": "not found"}), 404
	return jsonify({
		"id": str(d["_id"]),
		"invoice": d.get("invoice"),
		"po": d.get("po"),
		"result": d.get("result"),
		"createdAt": d.get("createdAt").isoformat() if d.get("createdAt") else None,
	})


@app.post('/api/export/csv')
def export_csv():
	"""Generate corrected invoice CSV from selected records."""
	try:
		data = request.get_json(force=True) or {}
		record_ids = data.get('recordIds', [])
		date_from = data.get('dateFrom')
		date_to = data.get('dateTo')
		status_filter = data.get('status')

		# Build query
		query = {}
		if record_ids:
			query['_id'] = {'$in': [ObjectId(rid) for rid in record_ids]}
		if date_from or date_to:
			date_q = {}
			if date_from:
				date_q['$gte'] = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
			if date_to:
				date_q['$lte'] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
			if date_q:
				query['createdAt'] = date_q
		if status_filter:
			query['result.status'] = status_filter

		records = list(verifications.find(query).sort("createdAt", DESCENDING))
		if not records:
			return jsonify({"error": "no records found"}), 404

		csv_content = generate_csv_from_records(records, export_type="corrected")
		if not csv_content:
			return jsonify({"error": "no data to export"}), 400

		# Save export history
		exports.insert_one({
			"type": "corrected_invoice",
			"recordCount": len(records),
			"createdAt": datetime.now(timezone.utc),
			"query": query
		})

		logger.info("CSV export generated: %d records", len(records))
		return jsonify({"csv": csv_content, "filename": f"corrected_invoice_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"}), 200
	except Exception as e:
		logger.exception("Export CSV error: %s", e)
		return jsonify({"error": "export_failed"}), 500


@app.post('/api/export/report')
def export_report():
	"""Generate discrepancy report CSV from selected records."""
	try:
		data = request.get_json(force=True) or {}
		record_ids = data.get('recordIds', [])
		date_from = data.get('dateFrom')
		date_to = data.get('dateTo')

		query = {}
		if record_ids:
			query['_id'] = {'$in': [ObjectId(rid) for rid in record_ids]}
		if date_from or date_to:
			date_q = {}
			if date_from:
				date_q['$gte'] = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
			if date_to:
				date_q['$lte'] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
			if date_q:
				query['createdAt'] = date_q

		records = list(verifications.find(query).sort("createdAt", DESCENDING))
		if not records:
			return jsonify({"error": "no records found"}), 404

		csv_content = generate_csv_from_records(records, export_type="report")
		if not csv_content:
			return jsonify({"error": "no discrepancies found"}), 400

		exports.insert_one({
			"type": "discrepancy_report",
			"recordCount": len(records),
			"createdAt": datetime.now(timezone.utc),
			"query": query
		})

		logger.info("Report export generated: %d records", len(records))
		return jsonify({"csv": csv_content, "filename": f"discrepancy_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"}), 200
	except Exception as e:
		logger.exception("Export report error: %s", e)
		return jsonify({"error": "export_failed"}), 500


@app.get('/api/export/history')
def export_history():
	"""Get export history."""
	try:
		limit = int(request.args.get('limit', '20'))
		items = []
		for d in exports.find().sort("createdAt", DESCENDING).limit(limit):
			items.append({
				"id": str(d["_id"]),
				"type": d.get("type"),
				"recordCount": d.get("recordCount", 0),
				"createdAt": d.get("createdAt").isoformat() if d.get("createdAt") else None,
			})
		return jsonify({"items": items}), 200
	except Exception as e:
		logger.exception("Export history error: %s", e)
		return jsonify({"error": "history_failed"}), 500


@app.post('/api/admin/records/clear')
def clear_records():
	if request.headers.get('X-Admin-Key') != os.getenv('ADMIN_KEY', 'dev'):
		return jsonify({"error": "unauthorized"}), 401
	res = verifications.delete_many({})
	return jsonify({"deleted": res.deleted_count})


@app.get('/api/health')
def health():
	return jsonify({"ok": True})


if __name__ == '__main__':
	app.run(host='0.0.0.0', port=int(os.getenv('PORT', '5000')), debug=True)
