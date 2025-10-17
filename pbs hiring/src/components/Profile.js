import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import logoImg from './pic/488604347_2675430962655935_1675751460889163498_n-removebg-preview.png';

const Profile = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    skills: '',
    experience: '',
    education: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add logic to save profile data
    console.log('Profile data:', formData);
    // Show success message or handle the save
  };

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="profile-container">
      <header className="profile-header">
        <div className="header-left">
          <img src={logoImg} alt="PBS Logo" className="profile-logo" />
          <span className="company-name">PBS ENGINEERING SERVICES</span>
        </div>
        <nav className="profile-nav">
          <a href="#" onClick={() => navigate('/dashboard')}>DASHBOARD</a>
          <a href="#" className="active">PROFILE</a>
          <div className="profile-dropdown">
            <span onClick={() => setShowDropdown(!showDropdown)}>MY PROFILE &#9660;</span>
            {showDropdown && (
              <div className="dropdown-menu">
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="profile-main">
        <div className="profile-content">
          <h1>Edit Profile</h1>
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-section">
              <h2>Personal Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Address</h2>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="address">Street Address</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="state">State</label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="zipCode">ZIP Code</label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2>Professional Information</h2>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="skills">Skills</label>
                  <textarea
                    id="skills"
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    placeholder="List your skills (e.g., Welding, Electrical Work, etc.)"
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="experience">Work Experience</label>
                  <textarea
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="Describe your work experience"
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="education">Education</label>
                  <textarea
                    id="education"
                    name="education"
                    value={formData.education}
                    onChange={handleChange}
                    placeholder="List your education and certifications"
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn">Save Changes</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Profile; 