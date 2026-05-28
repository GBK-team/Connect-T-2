import { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [logoTaps, setLogoTaps] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Handle logo tap for admin access
  const handleLogoTap = () => {
    setLogoTaps(prev => {
      const newTaps = prev + 1;
      if (newTaps === 7) {
        setShowAdminModal(true);
        return 0; // Reset counter
      }
      return newTaps;
    });
  };

  return (
    <div className="app">
      {/* Admin Access Modal */}
      {showAdminModal && (
        <div className="admin-modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAdminModal(false)}>✕</button>
            
            <div className="admin-modal-header">
              <div className="admin-modal-icon">🔐</div>
              <h2>Admin Access</h2>
              <p>Restricted login for Super Admin and Nagarsevak officers</p>
            </div>

            <div className="admin-options">
              <div 
                className="admin-option super-admin"
                onClick={() => {
                  setShowAdminModal(false);
                  setScreen('superAdminLogin');
                }}
              >
                <div className="option-icon green-bg">👤</div>
                <div className="option-content">
                  <h3>Super Admin Login</h3>
                  <p>Only 8554994735 can access main dashboard</p>
                </div>
                <span className="option-arrow">›</span>
              </div>

              <div 
                className="admin-option nagarsevak"
                onClick={() => {
                  setShowAdminModal(false);
                  setScreen('nagarsevakLogin');
                }}
              >
                <div className="option-icon orange-bg">🛡️</div>
                <div className="option-content">
                  <h3>Nagarsevak Login</h3>
                  <p>Approved ward officers can login here</p>
                </div>
                <span className="option-arrow">›</span>
              </div>

              <div 
                className="admin-option register"
                onClick={() => {
                  setShowAdminModal(false);
                  setScreen('nagarsevakRegister');
                }}
              >
                <div className="option-icon blue-bg">👤+</div>
                <div className="option-content">
                  <h3>Nagarsevak Register</h3>
                  <p>Register profile and wait for approval</p>
                </div>
                <span className="option-arrow">›</span>
              </div>
            </div>

            <div className="admin-info">
              <span className="info-icon">ℹ️</span>
              <span>Super admin unique ID access setup</span>
            </div>
          </div>
        </div>
      )}

      {/* HOME SCREEN */}
      {screen === 'home' && (
        <div className="screen home-screen">
          <div className="home-header">
            <div className="language-selector">
              <button>English</button>
              <button>हिंदी</button>
              <button>मराठी</button>
            </div>
            <div 
              className="home-logo" 
              onClick={handleLogoTap}
              title={logoTaps > 0 ? `Admin access: ${7 - logoTaps} more taps` : ''}
            >
              🏢
            </div>
          </div>

          <div className="home-content">
            <div className="home-tabs">
              <button 
                className={`tab-btn ${screen === 'home' ? 'active' : ''}`}
                onClick={() => setScreen('home')}
              >
                👤+ Register
              </button>
              <button 
                className="tab-btn"
                onClick={() => setScreen('citizenLogin')}
              >
                🔐 Login
              </button>
            </div>

            <form className="home-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" placeholder="Enter your full name" />
              </div>

              <div className="form-group">
                <label>Email Address (optional)</label>
                <input type="email" placeholder="Enter email address" />
              </div>

              <div className="form-group">
                <label>Date of Birth</label>
                <input type="text" placeholder="DD-MM-YYYY" />
              </div>

              <div className="form-group">
                <label>Address *</label>
                <input type="text" placeholder="Enter your address" />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <div className="phone-input">
                  <span className="country-code">IN +91</span>
                  <input type="tel" placeholder="10-digit mobile number" />
                </div>
              </div>

              <div className="form-group">
                <label>Ward / Location *</label>
                <select>
                  <option>Select your ward</option>
                  <option>Ward 1</option>
                  <option>Ward 2</option>
                </select>
              </div>

              <button className="continue-btn">Continue →</button>
            </form>
          </div>
        </div>
      )}

      {/* CITIZEN LOGIN SCREEN */}
      {screen === 'citizenLogin' && (
        <div className="screen citizen-login-screen">
          <div className="login-header orange-bg">
            <button className="back-btn" onClick={() => setScreen('home')}>‹</button>
            <div className="header-content">
              <h1>Citizen Login</h1>
              <p>Login with registered mobile number</p>
            </div>
            <div className="header-badge">🛡️ Secure Portal</div>
          </div>

          <div className="login-form">
            <div className="form-icon">🔐</div>
            <h2>Citizen Login</h2>
            <p>Enter your registered mobile number to receive an OTP</p>

            <div className="error-alert">
              <strong>Note:</strong> API connectivity will be configured with backend server
            </div>

            <div className="form-group">
              <label>MOBILE NUMBER</label>
              <div className="phone-input">
                <span>+91</span>
                <input type="tel" placeholder="Enter your mobile number" />
              </div>
            </div>

            <button className="send-otp-btn">📨 Send OTP</button>

            <div className="login-link">
              New citizen? <a href="#" onClick={() => setScreen('home')}>Register here</a>
            </div>
          </div>
        </div>
      )}

      {/* NAGARSEVAK LOGIN SCREEN */}
      {screen === 'nagarsevakLogin' && (
        <div className="screen nagarsevak-login-screen">
          <div className="login-header orange-bg">
            <button className="back-btn" onClick={() => setScreen('home')}>‹</button>
            <div className="header-content">
              <h1>Nagarsevak Login</h1>
              <p>Ward officer access portal</p>
            </div>
            <div className="header-badge">🛡️ Nagarsevak Portal</div>
          </div>

          <div className="login-form">
            <div className="form-icon">🛡️</div>
            <h2>Nagarsevak Login</h2>
            <p>Enter your registered mobile number to receive an OTP</p>

            <div className="success-alert">
              <strong>✓ Frontend Ready:</strong> Backend API integration pending
            </div>

            <div className="form-group">
              <label>MOBILE NUMBER</label>
              <div className="phone-input">
                <span>+91</span>
                <input type="tel" placeholder="9370796604" defaultValue="9370796604" />
              </div>
            </div>

            <button className="send-otp-btn orange">📨 Send OTP</button>

            <div className="login-link">
              New Nagarsevak? <a href="#" onClick={() => setScreen('nagarsevakRegister')}>Register here</a>
            </div>
          </div>
        </div>
      )}

      {/* NAGARSEVAK REGISTER SCREEN */}
      {screen === 'nagarsevakRegister' && (
        <div className="screen nagarsevak-register-screen">
          <div className="login-header orange-bg">
            <button className="back-btn" onClick={() => setScreen('home')}>‹</button>
            <div className="header-content">
              <h1>Nagarsevak Registration</h1>
              <p>Register as ward officer</p>
            </div>
            <div className="header-badge">📋 Registration</div>
          </div>

          <div className="login-form">
            <div className="form-icon">📋</div>
            <h2>Register as Nagarsevak</h2>
            <p>Fill in your details. Your account will be reviewed by the Super Admin.</p>

            <div className="success-alert">
              <strong>✓ Form Structure Ready:</strong> Backend validation pending
            </div>

            <div className="form-group">
              <label>FULL NAME *</label>
              <input type="text" placeholder="Vedant" defaultValue="Vedant" />
            </div>

            <div className="form-group">
              <label>MOBILE NUMBER *</label>
              <div className="phone-input">
                <span>+91</span>
                <input type="tel" placeholder="9370796604" defaultValue="9370796604" />
              </div>
            </div>

            <div className="form-group">
              <label>WARD *</label>
              <select defaultValue="Ward 1A">
                <option>Ward 1A</option>
                <option>Ward 1B</option>
                <option>Ward 2</option>
              </select>
            </div>

            <div className="form-group">
              <label>CONTACT NUMBER *</label>
              <input type="tel" placeholder="9370796604" defaultValue="9370796604" />
            </div>

            <div className="form-group">
              <label>OFFICE ADDRESS</label>
              <textarea placeholder="Enter your office address"></textarea>
            </div>

            <button className="continue-btn">Submit Registration →</button>
          </div>
        </div>
      )}

      {/* SUPER ADMIN LOGIN SCREEN */}
      {screen === 'superAdminLogin' && (
        <div className="screen super-admin-login-screen">
          <div className="login-header super-admin-bg">
            <button className="back-btn" onClick={() => setScreen('home')}>‹</button>
            <div className="header-content">
              <h1>Super Admin Login</h1>
              <p>Master dashboard access</p>
            </div>
            <div className="header-badge">👑 Secure Admin</div>
          </div>

          <div className="login-form super-admin-form">
            <div className="form-icon super-admin-icon">👑</div>
            <h2>Super Admin Portal</h2>
            <p>Enter your registered unique ID to access the master dashboard</p>

            <div className="security-info">
              <span className="lock-icon">🔐</span>
              <strong>Restricted Access:</strong> Only registered Super Admins can login
            </div>

            <div className="form-group">
              <label>UNIQUE ADMIN ID *</label>
              <input 
                type="text" 
                placeholder="Enter your unique admin ID" 
                className="admin-id-input"
              />
            </div>

            <div className="form-group">
              <label>ADMIN PASSWORD *</label>
              <input 
                type="password" 
                placeholder="Enter your secure password" 
                className="admin-password-input"
              />
            </div>

            <div className="form-group checkbox">
              <input type="checkbox" id="rememberMe" />
              <label htmlFor="rememberMe">Remember me on this device</label>
            </div>

            <button className="admin-login-btn">🔐 Access Dashboard</button>

            <div className="admin-footer">
              <a href="#" className="forgot-password">Forgot credentials?</a>
              <span className="divider">•</span>
              <a href="#" className="help-link">Need help?</a>
            </div>
          </div>

          <div className="admin-security-notice">
            <span>🛡️</span>
            <p>This portal maintains strict security protocols. All login attempts are logged.</p>
          </div>
        </div>
      )}
    </div>
  );
}
