import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';
import constructionImage from './pic/unnamed (1).webp';
import pbsLogo from './pic/488604347_2675430962655935_1675751460889163498_n-removebg-preview.png';
import { getActiveJobs } from '../firebase';

const HomePage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [visibleElements, setVisibleElements] = useState(new Set());
  const [counters, setCounters] = useState({ uptime: 0, users: 0, support: 0 });
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const ctaRef = useRef(null);
  const statsRef = useRef(null);

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      setScrolled(scrollTop > 50);
      
      // Check for visible elements
      const elements = [heroRef, featuresRef, ctaRef, statsRef];
      const newVisibleElements = new Set();
      
      elements.forEach((ref, index) => {
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
          if (isVisible) {
            newVisibleElements.add(index);
          }
        }
      });
      
      setVisibleElements(newVisibleElements);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load active jobs to display in feature cards as simplified job cards
  useEffect(() => {
    const loadJobs = async () => {
      try {
        const activeJobs = await getActiveJobs();
        if (Array.isArray(activeJobs)) {
          // Filter out expired jobs
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const validJobs = activeJobs.filter(job => {
            if (!job?.applicationEndDate) return true;
            const endDate = job.applicationEndDate?.seconds
              ? new Date(job.applicationEndDate.seconds * 1000)
              : new Date(job.applicationEndDate);
            endDate.setHours(0, 0, 0, 0);
            return endDate >= today;
          });
          const formatted = validJobs.map(job => ({
            id: job.id,
            title: job.title,
            description: job.description || '',
            applicationStartDate: job.applicationStartDate || null,
            applicationEndDate: job.applicationEndDate || null
          }));
          setJobs(formatted);
        } else {
          setJobs([]);
        }
      } catch (e) {
        setJobs([]);
      } finally {
        setLoadingJobs(false);
      }
    };
    loadJobs();
  }, []);

  // Helpers reused from ApplicantDashboard for Qualifications and Requirements
  const getQualificationsForJob = (jobTitle) => {
    const title = (jobTitle || '').toString().toUpperCase();
    switch (title) {
      case 'ELECTRICAL ENGINEER':
        return [
          "Bachelor's degree in Electrical Engineering",
          '3+ years experience',
          'Professional license preferred'
        ];
      case 'ELECTRONICS ENGINEER':
        return [
          "Bachelor's degree in Electronics or Electrical Engineering",
          '3+ years experience',
          'Professional license preferred'
        ];
      case 'PIPE FITTER':
        return [
          'Relevant technical diploma or certification',
          '3+ years experience',
          'Knowledge of construction safety practices'
        ];
      case 'TECHNICIAN':
        return [
          'Relevant technical diploma or certification',
          '3+ years experience',
          'Hands-on experience with tools and equipment'
        ];
      case 'NETWORK TECHNICIAN':
        return [
          "Bachelor's degree in Information Technology or related field",
          '3+ years experience',
          'Knowledge of networking protocols and hardware'
        ];
      case 'ELECTRICIAN':
        return [
          'Licensed or certified electrician',
          '3+ years experience',
          'Knowledge of electrical safety and NEC standards'
        ];
      case 'HELPER':
        return [
          'High school diploma or equivalent',
          'Physically fit',
          'Willingness to learn and assist skilled workers'
        ];
      case 'WELDER':
        return [
          'Certification in welding or related trade',
          '3+ years experience',
          'Knowledge of safety procedures and equipment handling'
        ];
      case 'PAINTER':
        return [
          "Bachelor's degree in Painting or related field",
          '3+ years experience',
          'Professional license preferred'
        ];
      case 'CCTV TECHNICIAN':
        return [
          'Relevant technical diploma or certification',
          '3+ years experience',
          'Experience installing and maintaining CCTV systems'
        ];
      case 'MASON':
        return [
          'Relevant technical diploma or certification',
          '3+ years experience',
          'Knowledge of construction safety and proper material handling'
        ];
      default:
        return [
          `Bachelor's degree in ${(jobTitle || '').split(' ')[0]} Engineering`,
          '3+ years experience',
          'Professional license preferred'
        ];
    }
  };

  const getJobDocumentRequirements = (jobTitle) => {
    const commonDocuments = [
      'Updated Resume / Bio Data',
      "Valid Government ID (National ID, Driver's License, etc.)",
      'Barangay Clearance',
      'NBI or Police Clearance',
      'Birth Certificate (PSA)',
      
    ];
    const title = (jobTitle || '').toString().toUpperCase();
    let professionalCertificate;
    switch (title) {
      case 'ELECTRICAL ENGINEER':
        professionalCertificate = 'Certificate: PRC License / ID (Registered Electrical Engineer or Master Electrician), Board Certificate';
        break;
      case 'ELECTRONICS ENGINEER':
        professionalCertificate = 'Certificate: PRC License / ID (Electronics Engineer), Board Certificate';
        break;
      case 'TECHNICIAN':
        professionalCertificate = 'Certificate: TESDA NC II or NC III (based on specialization)';
        break;
      case 'CCTV TECHNICIAN':
        professionalCertificate = 'Certificate: TESDA NC II (Electronic Products Assembly & Servicing or CCTV Installation)';
        break;
      case 'NETWORK TECHNICIAN':
        professionalCertificate = 'Certificate: TESDA NC II (Computer Systems Servicing)';
        break;
      case 'WELDER':
        professionalCertificate = 'Certificate: TESDA NC I or NC II (Shielded Metal Arc Welding – SMAW)';
        break;
      case 'MASON':
        professionalCertificate = 'Certificate: TESDA NC II (Masonry) (optional but preferred)';
        break;
      case 'PIPE FITTER':
        professionalCertificate = 'Certificate: TESDA NC II (Pipefitting)';
        break;
      case 'ELECTRICIAN':
        professionalCertificate = 'Certificate: TESDA NC II (Electrical Installation & Maintenance) / RME License (optional)';
        break;
      case 'PAINTER':
        professionalCertificate = 'Certificate: TESDA NC II (Painting – optional but preferred)';
        break;
      case 'HELPER':
        professionalCertificate = 'Certificate: None required';
        break;
      default:
        professionalCertificate = 'Certificate or License relevant to the position (if applicable)';
        break;
    }
    return [...commonDocuments, professionalCertificate];
  };

  // Availability status consistent with AdminDashboard
  const getJobAvailabilityStatus = (job) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = job?.applicationStartDate;
      if (start) {
        const startDate = start?.seconds ? new Date(start.seconds * 1000) : new Date(start);
        startDate.setHours(0, 0, 0, 0);
        if (startDate > today) return 'Inactive';
      }
      const end = job?.applicationEndDate;
      if (end) {
        const endDate = end?.seconds ? new Date(end.seconds * 1000) : new Date(end);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= today ? 'Active' : 'Closed';
      }
      return 'Active';
    } catch {
      return 'Active';
    }
  };

  // Animate counters
  useEffect(() => {
    if (visibleElements.has(0) && counters.uptime === 0) {
      const animateCounter = (target, key, duration = 2000) => {
        let start = 0;
        const increment = target / (duration / 16);
        
        const timer = setInterval(() => {
          start += increment;
          if (start >= target) {
            setCounters(prev => ({ ...prev, [key]: target }));
            clearInterval(timer);
          } else {
            setCounters(prev => ({ ...prev, [key]: Math.floor(start) }));
          }
        }, 16);
      };

      animateCounter(99.9, 'uptime');
      animateCounter(50, 'users');
      animateCounter(24, 'support');
    }
  }, [visibleElements, counters.uptime]);

  // Smooth scroll to section
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Features grid will display current active jobs instead of static feature cards

  return (
    <div className="homepage">
      {/* Navigation */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} role="navigation" aria-label="Main navigation">
        <div className="nav-container">
          <div className="nav-logo">
            <img src={pbsLogo} alt="PBS Engineering Services Logo" className="nav-logo-img" />
            <h2>PBS Engineering Services</h2>
          </div>
          
          <div className="nav-menu" role="menubar">
            <button onClick={() => scrollToSection('home')} className="nav-link" role="menuitem" aria-label="Go to home section">Home</button>
            <button onClick={() => scrollToSection('features')} className="nav-link" role="menuitem" aria-label="Go to career section">Career</button>
            <button onClick={() => scrollToSection('about')} className="nav-link" role="menuitem" aria-label="Go to about section">About</button>
            <button onClick={() => scrollToSection('contact')} className="nav-link" role="menuitem" aria-label="Go to contact section">Contact</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero" id="home" ref={heroRef} aria-labelledby="hero-title">
        <div className="hero-container">
          <div className={`hero-content ${visibleElements.has(0) ? 'animate-in' : ''}`}>
             <h1 id="hero-title" className="hero-title">
               Building a Better Tomorrow, <span className="highlight">Together</span>
             </h1>
            <p className="hero-description">
              At PBS Engineering Services, we turn visions into reality. With a passion for quality and innovation, our team delivers reliable engineering and construction solutions that shape stronger communities and a better tomorrow.
            </p>
                     <div className="hero-buttons">
                       <Link to="/login" className="btn-primary" aria-label="Join PBS Engineering Services team">Join our team</Link>
                       <button onClick={() => scrollToSection('features')} className="btn-secondary" aria-label="Learn more about PBS services">Learn More</button>
                     </div>
          </div>
          <div className={`hero-visual ${visibleElements.has(0) ? 'animate-in' : ''}`}>
            <div className="hero-card">
              <div className="hero-image-container">
                <img 
                  src={constructionImage} 
                  alt="Construction workers at job site" 
                  className="hero-construction-image"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>
         <div className="hero-bg-elements">
           <div className="floating-shape shape-1"></div>
           <div className="floating-shape shape-2"></div>
           <div className="floating-shape shape-3"></div>
         </div>
         <div className="hero-particles">
           <div className="particle particle-1"></div>
           <div className="particle particle-2"></div>
           <div className="particle particle-3"></div>
           <div className="particle particle-4"></div>
           <div className="particle particle-5"></div>
           <div className="particle particle-6"></div>
           <div className="particle particle-7"></div>
           <div className="particle particle-8"></div>
           <div className="particle particle-9"></div>
           <div className="particle particle-10"></div>
           <div className="particle particle-11"></div>
           <div className="particle particle-12"></div>
           <div className="particle particle-13"></div>
           <div className="particle particle-14"></div>
           <div className="particle particle-15"></div>
           <div className="particle particle-16"></div>
           <div className="particle particle-17"></div>
           <div className="particle particle-18"></div>
           <div className="particle particle-19"></div>
           <div className="particle particle-20"></div>
         </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features" ref={featuresRef} aria-labelledby="features-title">
        <div className="container">
          <div className={`section-header ${visibleElements.has(1) ? 'animate-in' : ''}`} style={{ textAlign: 'center' }}>
            <h2 id="features-title" style={{ textAlign: 'center', margin: '0 auto' }}>Explore Career Opportunities</h2>
          </div>
          <div className="features-grid" role="list">
            {loadingJobs ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Loading jobs...</div>
            ) : jobs.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center' }}>No jobs available</div>
            ) : (
              jobs.map((job, index) => (
                <article
                  key={job.id || index}
                  className={`feature-card ${visibleElements.has(1) ? 'animate-in' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  role="listitem"
                >
                  <div className="job-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                    <div className="job-card-title">{job.title}</div>
                    {(() => {
                      const status = getJobAvailabilityStatus(job);
                      if (status === 'Active') {
                        return (
                          <div className="job-status-indicator active" title="Available">
                            <span className="job-status-dot"></span>
                            <span className="job-status-text">Available</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="job-card-description">{job.description}</div>
                  <div className="job-card-requirements">
                    <div className="requirements-title">Qualifications:</div>
                    <ul className="requirements-list">
                      {getQualificationsForJob(job.title).map((q, i) => (
                        <li key={`q-${i}`}>{q}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="job-card-documents">
                    <div className="requirements-title">Requirements:</div>
                    <ul className="requirements-list">
                      {getJobDocumentRequirements(job.title).map((doc, i) => (
                        <li key={`doc-${i}`}>{doc}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="apply-now-bottom-btn"
                      onClick={() => (window.location.href = '/login')}
                    >
                      Apply now
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta" id="about" ref={ctaRef} aria-labelledby="about-title">
        <div className="container">
          <div className={`cta-content ${visibleElements.has(2) ? 'animate-in' : ''}`}>
            <h2 id="about-title">About Us</h2>
            <p>At PBS Engineering Services, we believe that every great project starts with dedication and teamwork. Founded and led by Ms. Phoebe Salvador, our company takes pride in delivering reliable and high-quality construction and electrical services that help shape better communities. We focus on construction, electrical system installations, and building management and security systems, combining technical knowledge with genuine passion and commitment to excellence. Over the years, we have been grateful to work with clients such as Maxipro Development Corporation (National Grid Corporation of the Philippines) and Malabon Container Corporation, whose trust inspires us to continue improving and providing services that make a real difference. At PBS Engineering Services, we do not just build structures. We build trust, relationships, and a better future for everyone we work with.</p>
          </div>
        </div>
        <div className="cta-bg-pattern" aria-hidden="true"></div>
      </section>

      {/* Footer */}
      <footer className="footer" id="contact" role="contentinfo" aria-label="Footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>PBS Engineering Services</h3>
              <p>Connecting construction professionals with their dream careers, one job at a time.</p>
            </div>
            <nav className="footer-section" aria-label="Job seeker navigation">
              <h4>For Job Seekers</h4>
              <button onClick={() => scrollToSection('features')} className="footer-link" aria-label="View career section">Career</button>
              <Link to="/signup" className="footer-link" aria-label="Create a new account">Get Started</Link>
              <Link to="/login" className="footer-link" aria-label="Sign in to your account">Sign In</Link>
            </nav>
            <address className="footer-section">
              <h4>Contact Us</h4>
              <p className="footer-link"><span aria-hidden="true">☎️</span> Phone: <a href="tel:+639190031179" style={{ color: 'inherit', textDecoration: 'none' }}>+63 919 003 1179</a></p>
              <p className="footer-link"><span aria-hidden="true">📧</span> Email: <a href="mailto:pbsengineeringph@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>pbsengineeringph@gmail.com</a></p>
            </address>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
