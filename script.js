const API_KEY = "8e631e95edc477c08f10a7b14a29b66c";
const NOW_PLAYING_API_URL = `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=ko-KR&page=1`;
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const MAX_RELEASE_AGE_DAYS = 60;
const TOP_RATED_LIMIT = 5;

const siteLogo = document.getElementById("site-logo");
const heroWords = document.querySelectorAll(".hero-word");
const introSound = document.getElementById("intro-sound");
const audioToggleButton = document.getElementById("audio-toggle");
const movieGrid = document.getElementById("movie-grid");
const topRatedList = document.getElementById("top-rated-list");
const KOREAN_TEXT_REGEX = /[가-힣]/;
const INTRO_FALLBACK_EVENTS = ["pointerdown", "keydown", "touchstart"];
const AUTO_PLAY_RETRY_DELAYS = [0, 60, 180, 500, 1200, 2500];

let userStoppedMusic = false;

function formatDate(dateString) {
  if (!dateString) return "개봉일 정보 없음";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateString));
}

function hasKoreanTitle(title) {
  return KOREAN_TEXT_REGEX.test(title ?? "");
}

function isWithinReleaseWindow(dateString) {
  if (!dateString) return false;

  const today = new Date();
  const releaseDate = new Date(dateString);

  if (Number.isNaN(releaseDate.getTime())) {
    return false;
  }

  today.setHours(0, 0, 0, 0);
  releaseDate.setHours(0, 0, 0, 0);

  const diffInMs = today.getTime() - releaseDate.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  return diffInDays >= 0 && diffInDays <= MAX_RELEASE_AGE_DAYS;
}

function playLogoIntro() {
  if (!siteLogo) return;

  siteLogo.classList.remove("play-intro");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      siteLogo.classList.add("play-intro");
    });
  });
}

function playHeroWordsIntro() {
  if (heroWords.length === 0) return;

  heroWords.forEach((word) => {
    word.classList.remove("play-intro");
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      heroWords.forEach((word) => {
        word.classList.add("play-intro");
      });
    });
  });
}

function removeIntroFallbackListeners() {
  INTRO_FALLBACK_EVENTS.forEach((eventName) => {
    window.removeEventListener(eventName, handleIntroSoundFallback);
  });

  window.removeEventListener("pageshow", handleIntroSoundFallback);
  window.removeEventListener("focus", handleIntroSoundFallback);
  window.removeEventListener("load", handleIntroSoundFallback);
  document.removeEventListener("visibilitychange", handleIntroSoundFallback);

  if (introSound) {
    introSound.removeEventListener("loadeddata", handleIntroSoundFallback);
    introSound.removeEventListener("loadedmetadata", handleIntroSoundFallback);
    introSound.removeEventListener("canplay", handleIntroSoundFallback);
    introSound.removeEventListener("canplaythrough", handleIntroSoundFallback);
  }
}

function addIntroFallbackListeners() {
  INTRO_FALLBACK_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, handleIntroSoundFallback);
  });

  window.addEventListener("pageshow", handleIntroSoundFallback);
  window.addEventListener("focus", handleIntroSoundFallback);
  window.addEventListener("load", handleIntroSoundFallback);
  document.addEventListener("visibilitychange", handleIntroSoundFallback);

  if (introSound) {
    introSound.addEventListener("loadeddata", handleIntroSoundFallback);
    introSound.addEventListener("loadedmetadata", handleIntroSoundFallback);
    introSound.addEventListener("canplay", handleIntroSoundFallback);
    introSound.addEventListener("canplaythrough", handleIntroSoundFallback);
  }
}

function updateAudioToggleButton() {
  if (!audioToggleButton || !introSound) {
    return;
  }

  const wantsMusicOn = !userStoppedMusic;
  audioToggleButton.textContent = wantsMusicOn ? "음악 정지" : "음악 재생";
  audioToggleButton.setAttribute("aria-pressed", String(wantsMusicOn));
  audioToggleButton.classList.toggle("is-muted", !wantsMusicOn);
}

async function tryPlayIntroSound(force = false) {
  if (!introSound || (!force && userStoppedMusic)) {
    return false;
  }

  if (!introSound.paused && !introSound.muted) {
    updateAudioToggleButton();
    return true;
  }

  try {
    // Start muted first to improve autoplay success, then unmute immediately.
    introSound.defaultMuted = true;
    introSound.muted = true;
    introSound.volume = 0.6;
    introSound.loop = true;
    if (introSound.readyState === 0) {
      introSound.load();
    }
    if (introSound.paused && introSound.ended) {
      introSound.currentTime = 0;
    }
    await introSound.play();

    window.setTimeout(() => {
      if (!userStoppedMusic && introSound) {
        introSound.defaultMuted = false;
        introSound.muted = false;
        introSound.volume = 0.6;
        updateAudioToggleButton();
      }
    }, 30);

    removeIntroFallbackListeners();
    updateAudioToggleButton();
    return true;
  } catch (error) {
    updateAudioToggleButton();
    console.warn("배경 음악을 재생하지 못했습니다.", error);
    return false;
  }
}

function handleIntroSoundFallback() {
  if (document.visibilityState === "hidden") {
    return;
  }

  void tryPlayIntroSound();
}

function scheduleAutoPlayRetries() {
  AUTO_PLAY_RETRY_DELAYS.forEach((delay) => {
    window.setTimeout(() => {
      if (!userStoppedMusic && introSound && introSound.paused) {
        void tryPlayIntroSound();
      }
    }, delay);
  });
}

function stopIntroSound() {
  if (!introSound) {
    return;
  }

  introSound.pause();
  introSound.currentTime = 0;
  introSound.defaultMuted = false;
  introSound.muted = false;
  userStoppedMusic = true;
  removeIntroFallbackListeners();
  updateAudioToggleButton();
}

function handleAudioToggleClick() {
  if (!introSound) {
    return;
  }

  if (introSound.paused) {
    userStoppedMusic = false;
    introSound.defaultMuted = false;
    introSound.muted = false;
    void tryPlayIntroSound(true);
    return;
  }

  stopIntroSound();
}

function initializeIntroExperience() {
  addIntroFallbackListeners();
  scheduleAutoPlayRetries();
  playLogoIntro();
  playHeroWordsIntro();
  updateAudioToggleButton();

  if (audioToggleButton) {
    audioToggleButton.addEventListener("click", handleAudioToggleClick);
  }

  if (introSound) {
    introSound.addEventListener("play", updateAudioToggleButton);
    introSound.addEventListener("pause", updateAudioToggleButton);
    introSound.addEventListener("ended", () => {
      if (!userStoppedMusic) {
        void tryPlayIntroSound(true);
      }
    });
  }
}

function createTopRatedItem(movie, index) {
  return `
    <a
      class="top-rated-item"
      href="https://www.themoviedb.org/movie/${movie.id}"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div class="top-rated-rank">${index + 1}</div>
      <div class="top-rated-info">
        <h3 class="top-rated-title">${movie.title}</h3>
        <p class="top-rated-meta">
          평점 ${movie.vote_average.toFixed(1)} · ${formatDate(movie.release_date)}
        </p>
      </div>
    </a>
  `;
}

function getEligibleMovies(movies) {
  return (movies ?? []).filter(
    (movie) =>
      hasKoreanTitle(movie.title) &&
      isWithinReleaseWindow(movie.release_date)
  );
}

function renderTopRatedFromMovies(movies) {
  if (!topRatedList) {
    return;
  }

  const topRatedMovies = [...movies]
    .sort((a, b) => {
      if (b.vote_average !== a.vote_average) {
        return b.vote_average - a.vote_average;
      }

      return b.vote_count - a.vote_count;
    })
    .slice(0, TOP_RATED_LIMIT);

  if (topRatedMovies.length === 0) {
    topRatedList.innerHTML =
      '<div class="top-rated-status">현재 상영 중인 탑 레이트 영화가 없습니다.</div>';
    return;
  }

  topRatedList.innerHTML = topRatedMovies.map(createTopRatedItem).join("");
}

function createMovieCard(movie) {
  const posterUrl = movie.poster_path
    ? `${IMAGE_BASE_URL}${movie.poster_path}`
    : "https://via.placeholder.com/500x750?text=No+Image";

  return `
    <a
      class="movie-card"
      href="https://www.themoviedb.org/movie/${movie.id}"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        class="poster"
        src="${posterUrl}"
        alt="${movie.title} 포스터"
        loading="lazy"
      />
      <div class="movie-info">
        <h3 class="movie-title">${movie.title}</h3>
        <p class="release-date">개봉일: ${formatDate(movie.release_date)}</p>
      </div>
    </a>
  `;
}

async function fetchNowPlayingMovies() {
  movieGrid.innerHTML = '<div class="status-card">영화 목록을 불러오는 중입니다...</div>';
  if (topRatedList) {
    topRatedList.innerHTML =
      '<div class="top-rated-status">현재 상영 탑 레이트 영화를 불러오는 중입니다...</div>';
  }

  try {
    const response = await fetch(NOW_PLAYING_API_URL);

    if (!response.ok) {
      throw new Error("영화 데이터를 불러오지 못했습니다.");
    }

    const data = await response.json();
    const movies = getEligibleMovies(data.results ?? []);

    if (movies.length === 0) {
      movieGrid.innerHTML =
        '<div class="status-card">한글 제목이 있고 개봉 후 60일 이내인 현재 상영작이 없습니다.</div>';
      if (topRatedList) {
        topRatedList.innerHTML =
          '<div class="top-rated-status">현재 상영 중인 탑 레이트 영화가 없습니다.</div>';
      }
      return;
    }

    movieGrid.innerHTML = movies.map(createMovieCard).join("");
    renderTopRatedFromMovies(movies);
  } catch (error) {
    movieGrid.innerHTML = `
      <div class="status-card">
        데이터를 불러오는 중 오류가 발생했습니다.<br />
        잠시 후 다시 시도해 주세요.
      </div>
    `;
    if (topRatedList) {
      topRatedList.innerHTML =
        '<div class="top-rated-status">현재 상영 탑 레이트 영화를 불러오지 못했습니다.</div>';
    }
    console.error(error);
  }
}

initializeIntroExperience();
fetchNowPlayingMovies();
