const API_BASE_URL = "https://movie-recommendation-backend-mc30.onrender.com";

const searchInput = document.getElementById("int");
const searchButton = document.getElementById("btn");
const movieResult = document.getElementById("movieResult");
const ratingFilter = document.getElementById("ratingFilter");
const genreFilter = document.getElementById("genreFilter");
const sortFilter = document.getElementById("sortFilter");
const resetFilter = document.getElementById("resetFilter");
const clearSearch = document.getElementById("clearSearch");
const showFavoritesButton = document.getElementById("showFavorites");
const movieCount = document.getElementById("movieCount");
const trendingSection = document.getElementById("trendingSection");
const trendingMovies = document.getElementById("trendingMovies");
const movieDetailsBox = document.getElementById("movieDetails");
const loadMoreButton = document.getElementById("loadMore");
const themeToggle = document.getElementById("themeToggle");

let currentTMDBMovies = [];
let currentSearchResults = [];
let currentPage = 1;
let currentSearchQuery = "";
let showingFavorites = false;

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

const genreMap = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western"
};

function getMovieGenres(movie) {
    if (Array.isArray(movie.genres)) {
        return movie.genres.map(genre =>
            typeof genre === "string" ? genre : genre.name
        );
    }

    if (Array.isArray(movie.genre_ids)) {
        return movie.genre_ids.map(id => genreMap[id]).filter(Boolean);
    }

    return [];
}

function isFavorite(movieId) {
    return favorites.some(movie => Number(movie.id) === Number(movieId));
}

function saveFavorites() {
    localStorage.setItem("favorites", JSON.stringify(favorites));
}

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, character => {
        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return characters[character];
    });
}

function getPosterUrl(path) {
    return path
        ? `https://image.tmdb.org/t/p/w500${path}`
        : "";
}

function createMovieCard(movie) {
    const title = escapeHTML(movie.title || movie.name || "Untitled");
    const poster = getPosterUrl(movie.poster_path);
    const rating = Number(movie.vote_average || 0).toFixed(1);
    const movieId = Number(movie.id);
    const favorite = isFavorite(movieId);

    const posterHTML = poster
        ? `<img src="${poster}" alt="${title}" loading="lazy">`
        : `<div class="no-poster">No poster available</div>`;

    return `
        <div class="movie-card" data-movie-id="${movieId}">
            <div class="movie-poster">
                ${posterHTML}
            </div>

            <div class="movie-info">
                <h3>${title}</h3>
                <p>⭐ ${rating}/10</p>

                <button
                    class="favorite-btn"
                    data-action="favorite"
                    data-id="${movieId}"
                    type="button">
                    ${favorite ? "❤️ Remove Favorite" : "🤍 Add Favorite"}
                </button>

                <button
                    data-action="details"
                    data-id="${movieId}"
                    type="button">
                    Details
                </button>

                <button
                    data-action="trailer"
                    data-id="${movieId}"
                    data-title="${title}"
                    type="button">
                    Watch Trailer
                </button>
            </div>
        </div>
    `;
}

function renderMovies(movieList, container = movieResult) {
    if (!container) return;

    if (!movieList.length) {
        container.innerHTML = "<p>No movies found. Try changing your search or filters.</p>";

        if (movieCount) {
            movieCount.textContent = "0 movies";
        }

        return;
    }

    container.innerHTML = movieList.map(createMovieCard).join("");

    if (movieCount) {
        movieCount.textContent =
            `${movieList.length} movie${movieList.length === 1 ? "" : "s"}`;
    }
}

function applyFilters() {
    let filteredMovies = [...currentSearchResults];

    if (
    ratingFilter &&
    ratingFilter.value &&
    ratingFilter.value !== "all"
) {
        const minimumRating = Number(ratingFilter.value);

        filteredMovies = filteredMovies.filter(movie =>
            Number(movie.vote_average || 0) >= minimumRating
        );
    }

    if (
    genreFilter &&
    genreFilter.value &&
    genreFilter.value !== "all"
) {
        filteredMovies = filteredMovies.filter(movie =>
            getMovieGenres(movie).some(genre =>
                genre.toLowerCase() === genreFilter.value.toLowerCase()
            )
        );
    }

    if (sortFilter && sortFilter.value) {
        if (sortFilter.value === "rating") {
            filteredMovies.sort((a, b) =>
                Number(b.vote_average || 0) - Number(a.vote_average || 0)
            );
        } else if (sortFilter.value === "title") {
            filteredMovies.sort((a, b) =>
                (a.title || "").localeCompare(b.title || "")
            );
        } else if (sortFilter.value === "release") {
            filteredMovies.sort((a, b) =>
                (b.release_date || "").localeCompare(a.release_date || "")
            );
        }
    }

    renderMovies(filteredMovies);
}
// ===============================
// SEARCH MOVIES
// ===============================


async function searchTMDB(query, page = 1) {
    if (!query.trim()) {
        movieResult.innerHTML = "<p>Please enter a movie name.</p>";
        return;
    }

    if (page === 1) {
        currentSearchQuery = query;
        currentPage = 1;
        currentSearchResults = [];
        showingFavorites = false;

        movieResult.innerHTML = "<p>Searching for movies...</p>";

        if (trendingSection) {
            trendingSection.style.display = "none";
        }
    } else {
        movieResult.insertAdjacentHTML(
            "beforeend",
            "<p id='loadingMore'>Loading more movies...</p>"
        );
    }

    try {
        const response = await fetch(
    `${API_BASE_URL}/search?query=${encodeURIComponent(query)}&page=${page}`
);

        console.log("TMDB response status:", response.status);

        const data = await response.json();

        console.log("TMDB response data:", data);

        if (!response.ok) {
            throw new Error(
                `TMDB request failed: ${response.status} - ${data.status_message || "Unknown error"}`
            );
        }

        if (page === 1) {
            currentSearchResults = data.results || [];
        } else {
            document.getElementById("loadingMore")?.remove();

            currentSearchResults = [
                ...currentSearchResults,
                ...(data.results || [])
            ];
        }

        currentPage = page;

        console.log("Movies received:", currentSearchResults.length);
        console.log("Selected genre:", genreFilter?.value);
        console.log("Selected rating:", ratingFilter?.value);

        applyFilters();

        if (loadMoreButton) {
            loadMoreButton.style.display =
                data.page < data.total_pages ? "block" : "none";
        }

    } catch (error) {
        console.error("Movie search error:", error);

        movieResult.innerHTML =
            `<p>${escapeHTML(error.message)}</p>`;
    }
}


// ===============================
// FAVORITES
// ===============================

function toggleFavorite(movieId) {
    const existingIndex = favorites.findIndex(
        movie => Number(movie.id) === Number(movieId)
    );

    if (existingIndex !== -1) {
        favorites.splice(existingIndex, 1);
    } else {
        const movie = currentSearchResults.find(
            item => Number(item.id) === Number(movieId)
        ) || currentTMDBMovies.find(
            item => Number(item.id) === Number(movieId)
        );

        if (movie) {
            favorites.push(movie);
        } else {
            return;
        }
    }

    saveFavorites();

    if (showingFavorites) {
        renderMovies(favorites);
    } else {
        applyFilters();
    }
}


function displayFavorites() {
    showingFavorites = true;

    if (trendingSection) {
        trendingSection.style.display = "none";
    }

    const validFavorites = favorites.filter(movie =>
        movie &&
        movie.id &&
        (movie.title || movie.name)
    );

    if (validFavorites.length !== favorites.length) {
        favorites = validFavorites;
        saveFavorites();
    }

    renderMovies(validFavorites);
}


// ===============================
// MOVIE DETAILS
// ===============================

async function showMovieDetails(movieId) {
    if (!movieDetailsBox) return;

const detailsSection = document.getElementById("movieDetailsSection");

if (detailsSection) {
    detailsSection.style.display = "block";
}

movieDetailsBox.style.display = "block";
movieDetailsBox.innerHTML = "<p>Searching for trailer...</p>";

// Scroll to the trailer below the movie results.
setTimeout(() => {
    (detailsSection || movieDetailsBox).scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}, 100);

    try {
        const response = await fetch(
            `${API_BASE_URL}/movie/${movieId}`,
            { headers: tmdbHeaders }
        );

        if (!response.ok) {
            throw new Error(`TMDB request failed: ${response.status}`);
        }

        const movie = await response.json();

        const title = escapeHTML(movie.title || "Untitled");
        const overview = escapeHTML(
            movie.overview || "No description available."
        );
        const releaseDate = escapeHTML(
            movie.release_date || "Unknown"
        );
        const rating = Number(movie.vote_average || 0).toFixed(1);
        const genres = (movie.genres || [])
            .map(genre => escapeHTML(genre.name))
            .join(", ");

        movieDetailsBox.innerHTML = `
            <div class="movie-details-content">
                <button id="closeMovieDetails" type="button">✖ Close</button>

                <h2>${title}</h2>

                <p><strong>Release date:</strong> ${releaseDate}</p>
                <p><strong>Rating:</strong> ⭐ ${rating}/10</p>
                <p><strong>Genres:</strong> ${genres || "Unknown"}</p>
                <p>${overview}</p>

                <button
                    data-action="trailer"
                    data-id="${Number(movie.id)}"
                    data-title="${title}"
                    type="button">
                    Watch Trailer
                </button>
            </div>
        `;

        const closeButton = document.getElementById("closeMovieDetails");

        if (closeButton) {
            closeButton.addEventListener("click", () => {
                movieDetailsBox.style.display = "none";
                movieDetailsBox.innerHTML = "";
            });
        }
    } catch (error) {
        console.error("Movie details error:", error);

        movieDetailsBox.innerHTML =
            "<p>Could not load movie details. Please try again.</p>";
    }
}


// ===============================
// MOVIE TRAILERS
// ===============================


async function showTrendingTrailer(movieId, movieTitle) {
    const movieDetailsBox = document.getElementById("movieDetails");
    const detailsSection = document.getElementById("movieDetailsSection");

    if (!movieDetailsBox) return;

    // Show the trailer in its designated location at the bottom.
    if (detailsSection) {
        detailsSection.style.display = "block";
    }

    movieDetailsBox.style.display = "block";

    movieDetailsBox.innerHTML = `
        <div class="trailer-heading">
            <h2>${escapeHTML(movieTitle)} - Trailer</h2>
            <button id="closeTrailer" type="button">✕ Close</button>
        </div>
        <p class="trailer-loading">Loading trailer...</p>
    `;

    // Do not move the trailer above the carousel.
    // Its position is controlled by home.html.

    movieDetailsBox.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    try {
        const response = await fetch(
    `${API_BASE_URL}/movie/${movieId}/videos`
);

        if (!response.ok) {
            throw new Error(`TMDB request failed: ${response.status}`);
        }

        const data = await response.json();

        const videos = data.results || [];

        const trailer =
            videos.find(video =>
                video.site === "YouTube" &&
                video.type === "Trailer" &&
                video.official
            ) ||
            videos.find(video =>
                video.site === "YouTube" &&
                video.type === "Trailer"
            ) ||
            videos.find(video =>
                video.site === "YouTube" &&
                video.type === "Teaser"
            );

        if (!trailer) {
            movieDetailsBox.innerHTML = `
                <div class="trailer-heading">
                    <h2>${escapeHTML(movieTitle)} - Trailer</h2>
                    <button id="closeTrailer" type="button">✕ Close</button>
                </div>
                <p>No trailer is available for this movie.</p>
            `;
            return;
        }

        movieDetailsBox.innerHTML = `
            <div class="trailer-heading">
                <h2>${escapeHTML(movieTitle)} - Trailer</h2>
                <button id="closeTrailer" type="button">✕ Close</button>
            </div>

            <div class="trailer-container">
                <iframe
                    src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}"
                    title="${escapeHTML(movieTitle)} trailer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerpolicy="strict-origin-when-cross-origin"
                    allowfullscreen>
                </iframe>
            </div>
        `;

    } catch (error) {
        console.error("Trailer loading error:", error);

        movieDetailsBox.innerHTML = `
            <div class="trailer-heading">
                <h2>${escapeHTML(movieTitle)} - Trailer</h2>
                <button id="closeTrailer" type="button">✕ Close</button>
            </div>
            <p>Unable to load the trailer. Please try again.</p>
        `;
    }

    // Close button
    const closeButton = document.getElementById("closeTrailer");

    if (closeButton) {
        closeButton.addEventListener("click", function () {
            movieDetailsBox.style.display = "none";

            if (detailsSection) {
                detailsSection.style.display = "none";
            }

            movieDetailsBox.innerHTML = "";
        });
    }
}

// ===============================
// LOAD TRENDING MOVIES
// ===============================

async function loadTrendingMovies() {
    if (!trendingMovies) return;

    trendingMovies.innerHTML = "<p>Loading trending movies...</p>";

    try {
    const response = await fetch(`${API_BASE_URL}/trending`);

    if (!response.ok) {
        const errorText = await response.text();

        console.error("TMDB status:", response.status);
        console.error("TMDB response:", errorText);

        throw new Error(
            `TMDB request failed with status ${response.status}`
        );
    }

        if (!response.ok) {
            throw new Error(`TMDB request failed: ${response.status}`);
        }

        const data = await response.json();

        currentTMDBMovies = data.results || [];

        trendingMovies.innerHTML = currentTMDBMovies
            .map(createMovieCard)
            .join("");
    } catch (error) {
        console.error("Trending movies error:", error);

        trendingMovies.innerHTML =
            "<p>Unable to load trending movies. Check your TMDB token.</p>";
    }
}


// ===============================
// MOVIE BUTTON EVENTS
// ===============================

document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;
    const movieId = Number(button.dataset.id);
    const movieTitle = button.dataset.title || "Movie";

    if (action === "favorite") {
        toggleFavorite(movieId);
    }

    if (action === "details") {
        showMovieDetails(movieId);
    }

    if (action === "trailer") {
        showTrendingTrailer(movieId, movieTitle);
    }
});


// ===============================
// SEARCH BUTTON
// ===============================

if (searchButton) {
    searchButton.addEventListener("click", function () {
        const query = searchInput.value.trim();

        currentPage = 1;
        searchTMDB(query, 1);
    });
}

if (searchInput) {
    searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();

            searchTMDB(searchInput.value.trim(), 1);
        }
    });
}


// ===============================
// FILTER EVENTS
// ===============================

if (ratingFilter) {
    ratingFilter.addEventListener("change", function () {
        showingFavorites = false;
        applyFilters();
    });
}

if (genreFilter) {
    genreFilter.addEventListener("change", function () {
        showingFavorites = false;
        applyFilters();
    });
}

if (sortFilter) {
    sortFilter.addEventListener("change", function () {
        showingFavorites = false;
        applyFilters();
    });
}


// ===============================
// RESET FILTERS
// ===============================

if (resetFilter) {
    resetFilter.addEventListener("click", function () {
        if (ratingFilter) ratingFilter.value = "";
        if (genreFilter) genreFilter.value = "";
        if (sortFilter) sortFilter.value = "";

        if (currentSearchResults.length > 0) {
            showingFavorites = false;
            applyFilters();
        } else {
            movieResult.innerHTML =
                "<p>Search for a movie to see results.</p>";
        }
    });
}


// ===============================
// CLEAR SEARCH
// ===============================

if (clearSearch) {
    clearSearch.addEventListener("click", function () {
        if (searchInput) searchInput.value = "";

        currentSearchResults = [];
        currentSearchQuery = "";
        currentPage = 1;
        showingFavorites = false;

        if (movieResult) {
            movieResult.innerHTML = "";
        }

        if (movieDetailsBox) {
            movieDetailsBox.style.display = "none";
            movieDetailsBox.innerHTML = "";
        }

        if (trendingSection) {
            trendingSection.style.display = "block";
        }

        if (loadMoreButton) {
            loadMoreButton.style.display = "none";
        }

        if (movieCount) {
            movieCount.textContent = "";
        }

        loadTrendingMovies();
    });
}


// ===============================
// SHOW FAVORITES
// ===============================

if (showFavoritesButton) {
    showFavoritesButton.addEventListener("click", function () {
        displayFavorites();
    });
}


// ===============================
// LOAD MORE SEARCH RESULTS
// ===============================

if (loadMoreButton) {
    loadMoreButton.addEventListener("click", function () {
        if (!currentSearchQuery) return;

        searchTMDB(currentSearchQuery, currentPage + 1);
    });
}


// ===============================
// LIGHT / DARK THEME
// ===============================

if (themeToggle) {
    themeToggle.addEventListener("click", function () {
        document.body.classList.toggle("dark-mode");

        const darkModeEnabled =
            document.body.classList.contains("dark-mode");

        localStorage.setItem(
            "movieTheme",
            darkModeEnabled ? "dark" : "light"
        );

        themeToggle.textContent =
            darkModeEnabled ? "☀️ Light Mode" : "🌙 Dark Mode";
    });
}

const savedTheme = localStorage.getItem("movieTheme");

if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");

    if (themeToggle) {
        themeToggle.textContent = "☀️ Light Mode";
    }
}


// ===============================
// INITIALIZE APP
// ===============================

document.addEventListener("DOMContentLoaded", function () {
    loadTrendingMovies();
});
// ========================================
// FEATURED MOVIE CAROUSEL
// ========================================

async function loadFeaturedCarousel() {
    const carouselInner = document.getElementById(
        "featuredCarouselInner"
    );

    const indicators = document.getElementById(
        "featuredIndicators"
    );

    if (!carouselInner || !indicators) return;

    try {
        const response = await fetch(`${API_BASE_URL}/trending`);

if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`);
}

const data = await response.json();


        const featuredMovies = (data.results || [])
            .filter(movie => movie.backdrop_path || movie.poster_path)
            .slice(0, 4);

        if (!featuredMovies.length) {
            carouselInner.innerHTML = `
                <div class="carousel-item active">
                    <div class="featured-loading">
                        No featured movies are available.
                    </div>
                </div>
            `;
            return;
        }

        // Make featured movies available to your existing
        // favorite functionality.
        currentTMDBMovies = [
            ...currentTMDBMovies,
            ...featuredMovies
        ].filter((movie, index, array) =>
            array.findIndex(item => item.id === movie.id) === index
        );

        indicators.innerHTML = "";
        carouselInner.innerHTML = "";

        featuredMovies.forEach((movie, index) => {
            const title = escapeHTML(movie.title || "Untitled");

            const imagePath =
                movie.backdrop_path || movie.poster_path;

            const imageURL =
                `https://image.tmdb.org/t/p/w1280${imagePath}`;

            const overview = escapeHTML(
                movie.overview
                    ? movie.overview.length > 180
                        ? movie.overview.slice(0, 180) + "..."
                        : movie.overview
                    : "Discover this trending movie."
            );

            const rating = Number(
                movie.vote_average || 0
            ).toFixed(1);

            // Carousel indicator
            const indicator = document.createElement("button");

            indicator.type = "button";
            indicator.dataset.bsTarget = "#movieCarousel";
            indicator.dataset.bsSlideTo = String(index);
            indicator.setAttribute(
                "aria-label",
                `Slide ${index + 1}`
            );

            if (index === 0) {
                indicator.classList.add("active");
                indicator.setAttribute("aria-current", "true");
            }

            indicators.appendChild(indicator);

            // Carousel slide
            const slide = document.createElement("div");

            slide.className =
                `carousel-item${index === 0 ? " active" : ""}`;

            slide.innerHTML = `
                <img
                    src="${imageURL}"
                    class="featured-backdrop"
                    alt="${title}"
                    ${index === 0 ? "" : 'loading="lazy"'}
                >

                <div class="featured-overlay"></div>

                <div class="featured-caption">
                    <span class="featured-label">
                        🔥 TRENDING MOVIE
                    </span>

                    <h2>${title}</h2>

                    <p class="featured-rating">
                        ⭐ ${rating}/10
                    </p>

                    <p class="featured-overview">
                        ${overview}
                    </p>

                    <div class="featured-actions">
                        <button
                            type="button"
                            class="featured-button"
                            data-action="details"
                            data-id="${Number(movie.id)}">
                            ℹ️ Details
                        </button>

                        <button
                            type="button"
                            class="featured-button"
                            data-action="trailer"
                            data-id="${Number(movie.id)}"
                            data-title="${title}">
                            ▶ Watch Trailer
                        </button>

                        <button
                            type="button"
                            class="featured-button favorite-featured"
                            data-action="favorite"
                            data-id="${Number(movie.id)}">
                            ${isFavorite(movie.id)
                                ? "❤️ Remove Favorite"
                                : "🤍 Add Favorite"}
                        </button>
                    </div>
                </div>
            `;

            carouselInner.appendChild(slide);

            const image = slide.querySelector(".featured-backdrop");

            image.addEventListener("error", () => {
                image.style.display = "none";
                slide.classList.add("featured-image-fallback");
            });
        });

        // Reinitialize Bootstrap carousel.
        const carouselElement = document.getElementById(
            "movieCarousel"
        );

        const existingCarousel =
            bootstrap.Carousel.getInstance(carouselElement);

        if (existingCarousel) {
            existingCarousel.dispose();
        }

        new bootstrap.Carousel(carouselElement, {
            interval: 6000,
            ride: "carousel",
            pause: "hover",
            wrap: true
        });

    } catch (error) {
        console.error("Featured carousel error:", error);

        carouselInner.innerHTML = `
            <div class="carousel-item active">
                <div class="featured-loading">
                    Unable to load featured movies.
                    Check your connection and TMDB token.
                </div>
            </div>
        `;
    }
}


// Update the featured favorite button after it is clicked.
document.addEventListener("click", function (event) {
    const button = event.target.closest(
        "#featuredCarouselInner [data-action='favorite']"
    );

    if (!button) return;

    const movieId = Number(button.dataset.id);

    // Allow the existing favorite handler to update localStorage.
    setTimeout(() => {
        button.textContent = isFavorite(movieId)
            ? "❤️ Remove Favorite"
            : "🤍 Add Favorite";
    }, 0);
});


// Load the featured carousel.
loadFeaturedCarousel();
// ========================================
// NAVIGATION SEARCH BAR
// ========================================

const navSearchInput = document.getElementById("navSearchInput");
const navSearchButton = document.getElementById("navSearchButton");

function performNavigationSearch() {
    const query = navSearchInput.value.trim();

    if (!query) {
        navSearchInput.focus();
        return;
    }

    // Copy the search query into the main search box.
    if (searchInput) {
        searchInput.value = query;
    }

    // Use the existing TMDB search function.
    searchTMDB(query, 1);

    // Scroll to the movie results.
    if (movieResult) {
        movieResult.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

if (navSearchButton) {
    navSearchButton.addEventListener(
        "click",
        performNavigationSearch
    );
}

if (navSearchInput) {
    navSearchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            performNavigationSearch();
        }
    });
}
document.addEventListener("click", function (event) {
    if (event.target.id === "closeTrailer") {
        const trailerBox = document.getElementById("movieDetails");

        if (trailerBox) {
            trailerBox.style.display = "none";
            trailerBox.innerHTML = "";
        }
    }
});