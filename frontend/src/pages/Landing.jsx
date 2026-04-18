import React from 'react';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import GovSchemes from '../components/landing/GovSchemes';
import TrustStrip from '../components/landing/TrustStrip';
import Features2 from '../components/landing/Features2';
import Hero2 from '../components/landing/Hero2';
import HowItWorks2 from '../components/landing/HowItWorks2';
import Testimonials from '../components/landing/Testimonials';
import Footer from '../components/landing/Footer';
import AppPreview from '../components/landing/AppPreview';

function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Hero />
      <Features2 />
      <GovSchemes />
      <AppPreview />
      <HowItWorks2 />
      <Testimonials />
      <Hero2/>
      <TrustStrip/>
      <Footer />
    </div>
  );
}

export default Landing;
