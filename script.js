// ==========================================================================
// PhysioCare — interactions (no backend, everything runs client-side)
// ==========================================================================

// 1. Sticky header shrink on scroll
const header = document.getElementById('siteHeader');
function handleHeaderScroll() {
  if (window.scrollY > 20) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}
window.addEventListener('scroll', handleHeaderScroll, { passive: true });
handleHeaderScroll();

// 2. Mobile menu toggle
const menuToggle = document.getElementById('menuToggle');
const mobileDrawer = document.getElementById('mobileDrawer');

function closeDrawer() {
  menuToggle.classList.remove('open');
  mobileDrawer.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}

menuToggle.addEventListener('click', () => {
  const isOpen = mobileDrawer.classList.toggle('open');
  menuToggle.classList.toggle('open', isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

// Close the drawer whenever a link inside it is tapped
mobileDrawer.querySelectorAll('a, button').forEach((el) => {
  el.addEventListener('click', closeDrawer);
});

// 3. Active nav link + bottom nav highlight while scrolling
const sections = ['home', 'services', 'about', 'contact']
  .map((id) => document.getElementById(id))
  .filter(Boolean);

const navLinks = document.querySelectorAll('.nav-link');
const bottomLinks = document.querySelectorAll('.bottom-link[href^="#"]');

function setActiveLink(id) {
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
  });
  bottomLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
  });
}

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setActiveLink(entry.target.id);
      }
    });
  },
  { rootMargin: '-40% 0px -55% 0px' }
);
sections.forEach((section) => sectionObserver.observe(section));

// 4. Reveal-on-scroll animation for sections
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);
revealEls.forEach((el) => revealObserver.observe(el));
