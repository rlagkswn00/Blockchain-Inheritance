"use client";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-top">
          <div className="footer-section">
            <h3>고객센터</h3>
            <ul>
              <li><a href="#">1599-8000</a></li>
              <li><a href="#">평일 09:00~18:00</a></li>
              <li><a href="#">전화상담</a></li>
              <li><a href="#">이메일상담</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>이용안내</h3>
            <ul>
              <li><a href="#">이용안내</a></li>
              <li><a href="#">금리안내</a></li>
              <li><a href="#">상품공시실</a></li>
              <li><a href="#">개인정보처리방침</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>신한은행</h3>
            <ul>
              <li><a href="#">은행소개</a></li>
              <li><a href="#">신한멤버스</a></li>
              <li><a href="#">GLOBAL</a></li>
              <li><a href="#">신용정보활용체제</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <a href="#">개인정보처리방침</a>
            <a href="#">신용정보활용체제</a>
            <a href="#">이용약관</a>
            <a href="#">개인정보처리방침</a>
          </div>
          <div className="footer-bottom-right">
            ©SHINHAN BANK. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
