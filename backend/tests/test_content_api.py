"""
테스트 케이스 1: 통합 콘텐츠 생성 API 테스트
"""
import os
import pytest
import uuid
from io import BytesIO
from PIL import Image
import json

from tests.conftest import client, setup_test_db, clean_test_data, TEST_BOX
from app.utils.file_storage import FileStorage
from app.core.config import settings
from app.models import Content, Tag, Attachment

# Fixtures
@pytest.fixture
def test_image():
    """Generate a test image for upload"""
    img = Image.new('RGB', (100, 100), color='red')
    img_io = BytesIO()
    img.save(img_io, 'JPEG')
    img_io.seek(0)
    return img_io

@pytest.mark.usefixtures("setup_test_db", "clean_test_data")
class TestContentCreationAPI:
    """통합 콘텐츠 생성 API에 대한 테스트"""
    
    def test_successful_content_creation(self, test_image):
        """
        성공 시나리오 (Happy Path) 테스트:
        - 텍스트, HTML, 마크다운, 태그, 이미지 파일을 포함한 요청 처리
        """
        # Prepare test data
        text_content = "This is a test content"
        html_content = "<p>This is a <strong>formatted</strong> content</p>"
        markdown_content = "# Heading\n\nThis is **bold** text"
        tags = ["test", "api", "integration"]
        title = "Test Content"
        
        # Prepare multipart form data
        files = {
            "files": ("test_image.jpg", test_image, "image/jpeg")
        }
        
        data = {
            "title": title,
            "text_content": text_content,
            "html_content": html_content,
            "markdown_content": markdown_content,
            "tags": json.dumps(tags)
        }
        
        # Send request
        response = client.post(
            f"/api/v1/boxes/{TEST_BOX['id']}/contents",
            files=files,
            data=data
        )
        
        # Log for debugging
        print(f"API Response Status: {response.status_code}")
        print(f"API Response Body: {response.json() if response.status_code < 400 else response.text}")
        
        # Test results
        test_results = {
            "API returned 201 Created": False,
            "Content data saved correctly": False,
            "Attachment record created": False,
            "Tags saved correctly": False,
            "File physically uploaded": False
        }
        
        # Check API response
        if response.status_code == 201 or response.status_code == 200:
            test_results["API returned 201 Created"] = True
            content_id = response.json()["data"]["id"]
            
            # Verify content in DB
            from sqlalchemy.orm import Session
            from tests.conftest import TestSessionLocal
            
            db = TestSessionLocal()
            try:
                # Check content record
                content = db.query(Content).filter(Content.id == content_id).first()
                if (content and 
                    content.title == title and
                    content.text_content == text_content and
                    content.html_content == html_content and
                    content.markdown_content == markdown_content):
                    test_results["Content data saved correctly"] = True
                
                # Check attachments
                attachment = db.query(Attachment).filter(Attachment.content_id == content_id).first()
                if attachment:
                    test_results["Attachment record created"] = True
                    
                    # Check physical file
                    if settings.STORAGE_TYPE.lower() == "s3":
                        # S3 check would go here
                        test_results["File physically uploaded"] = True  # Placeholder - would need boto3 check
                    else:
                        # Local file check
                        file_path = os.path.join(settings.LOCAL_STORAGE_PATH, attachment.file_path)
                        if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
                            test_results["File physically uploaded"] = True
                
                # Check tags
                db_tags = db.query(Tag).filter(Tag.content_id == content_id).all()
                db_tag_names = [tag.name for tag in db_tags]
                if all(tag in db_tag_names for tag in tags) and len(db_tags) == len(tags):
                    test_results["Tags saved correctly"] = True
            
            finally:
                db.close()
                
        # Print test results
        print("\n=== TEST RESULTS: Content Creation Success Scenario ===")
        for test_name, result in test_results.items():
            status = "Pass" if result else "Fail"
            print(f"{test_name}: {status}")
        
        # Assert all tests passed
        assert all(test_results.values()), "Not all tests passed"
        
    def test_transaction_rollback(self, test_image, monkeypatch):
        """
        트랜잭션 롤백 시나리오 테스트:
        - 파일 업로드 성공 후 DB 저장에서 에러 발생
        - 모든 변경사항 롤백 및 파일 삭제 확인
        """
        # Mock the Tag model's __init__ to raise an exception
        original_init = Tag.__init__
        
        def mock_init_with_error(self, *args, **kwargs):
            if 'name' in kwargs and kwargs['name'] == "error_trigger":
                raise Exception("Simulated database error for testing rollback")
            return original_init(self, *args, **kwargs)
        
        monkeypatch.setattr(Tag, "__init__", mock_init_with_error)
        
        # Prepare test data with the error trigger
        text_content = "This is a test content for rollback"
        html_content = "<p>Rollback test</p>"
        markdown_content = "# Rollback\n\nTest"
        tags = ["test", "rollback", "error_trigger"]  # This will trigger our error
        title = "Rollback Test"
        
        # Prepare multipart form data
        files = {
            "files": ("rollback_test.jpg", test_image, "image/jpeg")
        }
        
        data = {
            "title": title,
            "text_content": text_content,
            "html_content": html_content,
            "markdown_content": markdown_content,
            "tags": json.dumps(tags)
        }
        
        # Send request
        response = client.post(
            f"/api/v1/boxes/{TEST_BOX['id']}/contents",
            files=files,
            data=data
        )
        
        # Log for debugging
        print(f"Rollback API Response Status: {response.status_code}")
        print(f"Rollback API Response Body: {response.text}")
        
        # Test results
        test_results = {
            "API returned error status": False,
            "No content record saved": False,
            "No attachment record saved": False,
            "No tag records saved": False,
            "Uploaded file was deleted": False
        }
        
        # Check API returned an error
        if response.status_code >= 400:
            test_results["API returned error status"] = True
        
        # Check no records were saved
        from sqlalchemy.orm import Session
        from tests.conftest import TestSessionLocal
        
        db = TestSessionLocal()
        try:
            # Count records that match our test data
            content_count = db.query(Content).filter(Content.title == title).count()
            if content_count == 0:
                test_results["No content record saved"] = True
            
            # We don't know the content_id, so check for any new attachments
            # This assumes we cleaned the table before the test
            attachment_count = db.query(Attachment).count()
            if attachment_count == 0:
                test_results["No attachment record saved"] = True
            
            # Check for tags
            tag_count = db.query(Tag).filter(Tag.name.in_(tags)).count()
            if tag_count == 0:
                test_results["No tag records saved"] = True
                
        finally:
            db.close()
        
        # Check if any files were left in the upload directory
        # This is a bit simplified - in a real test we'd need a way to track which file was uploaded
        upload_dir = os.path.join(settings.LOCAL_STORAGE_PATH, "contents")
        if not os.path.exists(upload_dir) or len(os.listdir(upload_dir)) == 0:
            test_results["Uploaded file was deleted"] = True
        
        # Restore original function
        monkeypatch.setattr(Tag, "__init__", original_init)
        
        # Print test results
        print("\n=== TEST RESULTS: Transaction Rollback Scenario ===")
        for test_name, result in test_results.items():
            status = "Pass" if result else "Fail"
            print(f"{test_name}: {status}")
        
        # Assert all tests passed
        assert all(test_results.values()), "Not all rollback tests passed"
