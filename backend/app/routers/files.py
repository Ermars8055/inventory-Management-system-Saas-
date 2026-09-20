"""File upload/download — stores in /data/uploads/ volume."""
import os, uuid, time
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import FileAttachment, User
from ..dependencies import get_current_user, same_org
from ..pagination import detect_mime

router = APIRouter(prefix="/files", tags=["files"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/data/uploads")
MAX_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED = {"image/jpeg", "image/png", "image/gif", "application/pdf", "text/csv",
           "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
           "application/vnd.ms-excel", "application/octet-stream"}

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    entity_type: str = Query(""),
    entity_id: str = Query(""),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 10MB)")

    # Validate MIME type from actual file bytes, not just the header
    detected = detect_mime(content)
    if file.content_type not in ALLOWED and (not detected or detected not in ALLOWED):
        raise HTTPException(400, "File type not allowed")

    fid = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "")[1] or ""
    stored = f"{fid}{ext}"
    path = os.path.join(UPLOAD_DIR, stored)

    with open(path, "wb") as f:
        f.write(content)

    att = FileAttachment(
        id=fid, organization_id=user.organization_id,
        entity_type=entity_type or None, entity_id=entity_id or None,
        filename=stored, original_name=file.filename or "file",
        size=len(content), mime_type=file.content_type,
        uploaded_by=user.name, created_at=datetime.utcnow().isoformat(),
    )
    db.add(att)
    db.commit()
    return {"id": fid, "name": att.original_name, "size": att.size, "url": f"/files/{fid}"}


@router.get("")
def list_files(
    entity_type: str = Query(""), entity_id: str = Query(""),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    q = db.query(FileAttachment).filter(FileAttachment.organization_id == user.organization_id)
    if entity_type:
        q = q.filter(FileAttachment.entity_type == entity_type)
    if entity_id:
        q = q.filter(FileAttachment.entity_id == entity_id)
    files = q.order_by(FileAttachment.created_at.desc()).all()
    return [{"id": f.id, "name": f.original_name, "size": f.size, "mimeType": f.mime_type,
             "uploadedBy": f.uploaded_by, "createdAt": f.created_at} for f in files]


@router.get("/logo/{filename}")
def serve_logo(filename: str):
    """Serve org logos — public (no auth needed, logo shown on login page)."""
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(404, "Logo not found")
    mime = "image/png" if filename.endswith(".png") else "image/jpeg" if filename.endswith(".jpg") else "image/svg+xml"
    return FileResponse(path, media_type=mime)


@router.get("/{file_id}")
def download(file_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    att = db.query(FileAttachment).filter(FileAttachment.id == file_id).first()
    if not att:
        raise HTTPException(404, "File not found")
    same_org(att.organization_id, user)
    path = os.path.join(UPLOAD_DIR, att.filename)
    if not os.path.exists(path):
        raise HTTPException(404, "File missing from storage")
    return FileResponse(path, filename=att.original_name, media_type=att.mime_type)


@router.delete("/{file_id}", status_code=204)
def delete_file(file_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    att = db.query(FileAttachment).filter(FileAttachment.id == file_id).first()
    if not att:
        raise HTTPException(404, "File not found")
    same_org(att.organization_id, user)
    path = os.path.join(UPLOAD_DIR, att.filename)
    if os.path.exists(path):
        os.remove(path)
    db.delete(att)
    db.commit()
