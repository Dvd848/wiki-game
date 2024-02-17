import React from 'react';

const Header: React.FC = () => {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark" data-bs-theme="dark">
        <div className="container-fluid">
            <a className="navbar-brand" href="?home">מה הערך?</a>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar_supported_content" aria-controls="navbar_supported_content" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
            </button>
       
            <div className="collapse navbar-collapse" id="navbar_supported_content">
                <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                    <li className="nav-item">
                        <a className="nav-link" href="#" data-bs-target="#instructions_modal" data-bs-toggle="modal">הוראות</a>
                    </li>
                    <li className="nav-item">
                        <a className="nav-link" href="#" data-bs-target="#about_modal" data-bs-toggle="modal">אודות</a>
                    </li>
                </ul>
                <span className="navbar-text d-none d-lg-block">
                    משחק זיהוי ערכים
                </span> 
            </div>
        </div>
    </nav>
  );
}

export default Header;
