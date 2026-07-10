// ==========================================================================
// PhysioCare — Reviews, backed by Firebase Firestore.
// This runs entirely in the browser (loaded as a <script type="module">),
// so there's still no custom backend — Firebase IS the backend-as-a-service.
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAnalytics,
  isSupported as analyticsIsSupported,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---- Your Firebase config ----
const firebaseConfig = {
  apiKey: "AIzaSyAo-V2MLYNHOpWf0cdvrQBiDseZdomhjLY",
  authDomain: "physio-rating-db.firebaseapp.com",
  projectId: "physio-rating-db",
  storageBucket: "physio-rating-db.firebasestorage.app",
  messagingSenderId: "333946057214",
  appId: "1:333946057214:web:69bd267e59aa18b6a810af",
  measurementId: "G-LN0KC5FZVG",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Analytics only works when the page is served over http(s) — guard it so
// opening index.html directly (file://) doesn't throw errors.
analyticsIsSupported()
  .then((supported) => {
    if (supported) getAnalytics(app);
  })
  .catch(() => {});

const reviewsCollection = collection(db, "reviews");

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
const reviewsList = document.getElementById("reviewsList");
const reviewsStatus = document.getElementById("reviewsStatus");
const avgRatingNumber = document.getElementById("avgRatingNumber");
const avgRatingStars = document.getElementById("avgRatingStars");
const reviewCountEl = document.getElementById("reviewCount");

function starString(rating) {
  const rounded = Math.round(rating);
  const filled = "★".repeat(rounded);
  const empty = `<span class="star-empty">${"★".repeat(5 - rounded)}</span>`;
  return filled + empty;
}

function initialsFor(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "";
  const date = timestamp.toDate();
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function renderReviews(reviews) {
  if (reviews.length === 0) {
    reviewsList.innerHTML = '<p class="reviews-status">No reviews yet — be the first to share your experience!</p>';
    avgRatingNumber.textContent = "–";
    avgRatingStars.innerHTML = starString(0);
    reviewCountEl.textContent = "No reviews yet";
    return;
  }

  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  const average = total / reviews.length;

  avgRatingNumber.textContent = average.toFixed(1);
  avgRatingStars.innerHTML = starString(average);
  reviewCountEl.textContent = `Based on ${reviews.length} review${reviews.length === 1 ? "" : "s"}`;

  reviewsList.innerHTML = reviews
    .map(
      (r) => `
      <div class="review-card">
        <div class="review-top">
          <div class="review-avatar">${initialsFor(r.name)}</div>
          <div>
            <p class="review-name">${escapeHtml(r.name)}</p>
            <p class="review-date">${formatDate(r.createdAt)}</p>
          </div>
        </div>
        <div class="review-stars">${starString(r.rating)}</div>
        <p class="review-comment">${escapeHtml(r.comment)}</p>
      </div>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Live-updating list, ordered newest first
const reviewsQuery = query(reviewsCollection, orderBy("createdAt", "desc"));
onSnapshot(
  reviewsQuery,
  (snapshot) => {
    const reviews = snapshot.docs.map((doc) => doc.data());
    renderReviews(reviews);
  },
  (error) => {
    console.error("Failed to load reviews:", error);
    reviewsStatus.textContent =
      "Couldn't load reviews right now. Check your Firestore setup (see reviews.js comments).";
  }
);

// ---------------------------------------------------------------------------
// Add Review modal
// ---------------------------------------------------------------------------
const modalOverlay = document.getElementById("reviewModalOverlay");
const openModalBtn = document.getElementById("openReviewModal");
const closeModalBtn = document.getElementById("closeReviewModal");
const reviewForm = document.getElementById("reviewForm");
const nameInput = document.getElementById("reviewName");
const commentInput = document.getElementById("reviewComment");
const starPicker = document.getElementById("starPicker");
const starButtons = starPicker.querySelectorAll(".star-btn");
const formError = document.getElementById("reviewFormError");
const submitBtn = document.getElementById("submitReviewBtn");

let selectedRating = 0;

function openModal() {
  modalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal() {
  modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
  reviewForm.reset();
  selectedRating = 0;
  updateStars(0);
  formError.textContent = "";
}

openModalBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalOverlay.classList.contains("open")) closeModal();
});

function updateStars(value) {
  starButtons.forEach((btn) => {
    btn.classList.toggle("selected", Number(btn.dataset.value) <= value);
  });
}

starButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedRating = Number(btn.dataset.value);
    updateStars(selectedRating);
  });
  btn.addEventListener("mouseenter", () => updateStars(Number(btn.dataset.value)));
});
starPicker.addEventListener("mouseleave", () => updateStars(selectedRating));

reviewForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  const name = nameInput.value.trim();
  const comment = commentInput.value.trim();

  if (!name || !comment) {
    formError.textContent = "Please fill in your name and review.";
    return;
  }
  if (selectedRating < 1 || selectedRating > 5) {
    formError.textContent = "Please select a star rating.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  try {
    await addDoc(reviewsCollection, {
      name,
      comment,
      rating: selectedRating,
      createdAt: serverTimestamp(),
    });
    closeModal();
  } catch (err) {
    console.error("Failed to submit review:", err);
    formError.textContent = "Something went wrong submitting your review. Please try again.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Review";
  }
});
