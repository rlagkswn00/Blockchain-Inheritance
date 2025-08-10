"use client";

export default function Header() {
  return (
    <header className="header">
      <div className="header-top">
        <div className="header-top-content">
          <div className="header-top-left">
            <a href="#">개인</a>
            <a href="#">기업</a>
            <a href="#">금융상품</a>
          </div>
          <div className="header-top-right">
            <a href="#">금융서비스</a>
            <a href="#">고객센터</a>
            <a href="#">은행소개</a>
            <a href="#">신한멤버스</a>
            <a href="#">GLOBAL</a>
          </div>
        </div>
      </div>
      <div className="header-main">
        <div className="header-main-content">
          <a href="#" className="logo">
            신한은행 블록체인 상속 시스템
          </a>
          <nav className="header-nav">
            <a href="#" className="active">예금/신탁</a>
            <a href="#">ISA</a>
            <a href="#">대출</a>
            <a href="#">펀드</a>
            <a href="#">외환</a>
          </nav>
          <div className="header-actions">
            <button className="search-btn">🔍</button>
            <button className="login-btn">로그인</button>
          </div>
        </div>
      </div>
      <div className="sub-nav">
        <div className="sub-nav-content">
          <a href="#" className="active">예금/신탁</a>
          <a href="#">ISA</a>
          <a href="#">대출</a>
          <a href="#">펀드</a>
          <a href="#">외환</a>
        </div>
      </div>
    </header>
  );
}
