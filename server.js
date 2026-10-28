require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;

// Replace this with your deployed GitHub Pages origin.
const allowedOrigins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501",
    "https://riyasutar19-cmyk.github.io"
];

app.use(cors({
    origin: allowedOrigins
}));

app.use(cors({
    origin: allowedOrigins
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Movie Recommendation API is running."
    });
});

app.get("/api/trending", async (req, res) => {
    try {
        const response = await fetch(
            "https://api.themoviedb.org/3/trending/movie/week",
            {
                headers: {
                    accept: "application/json",
                    Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`
                }
            }
        );

        if (!response.ok) {
            return res.status(response.status).json({
                error: "Unable to fetch trending movies."
            });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error("Trending error:", error.message);

        res.status(500).json({
            error: "Server error while loading trending movies."
        });
    }
});

app.get("/api/search", async (req, res) => {
    try {
        const query = req.query.query;

        if (!query || !query.trim()) {
            return res.status(400).json({
                error: "Please enter a movie title."
            });
        }

        const url = new URL(
            "https://api.themoviedb.org/3/search/movie"
        );

        url.searchParams.set("query", query.trim());
        url.searchParams.set("page", req.query.page || "1");
        url.searchParams.set("include_adult", "false");

        const response = await fetch(url, {
            headers: {
                accept: "application/json",
                Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({
                error: "Unable to search movies."
            });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error("Search error:", error.message);

        res.status(500).json({
            error: "Server error while searching movies."
        });
    }
});

app.get("/api/movie/:id/videos", async (req, res) => {
    try {
        const movieId = req.params.id;

        if (!/^\d+$/.test(movieId)) {
            return res.status(400).json({
                error: "Invalid movie ID."
            });
        }

        const response = await fetch(
            `https://api.themoviedb.org/3/movie/${movieId}/videos`,
            {
                headers: {
                    accept: "application/json",
                    Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`
                }
            }
        );

        if (!response.ok) {
            return res.status(response.status).json({
                error: "Unable to fetch movie trailers."
            });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error("Trailer error:", error.message);

        res.status(500).json({
            error: "Server error while loading trailers."
        });
    }
});
app.get("/api/movie/:id", async (req, res) => {
    try {
        const movieId = req.params.id;

        if (!/^\d+$/.test(movieId)) {
            return res.status(400).json({
                error: "Invalid movie ID."
            });
        }

        const response = await fetch(
            `https://api.themoviedb.org/3/movie/${movieId}`,
            {
                headers: {
                    accept: "application/json",
                    Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error("Movie details error:", error.message);

        res.status(500).json({
            error: "Unable to load movie details."
        });
    }
});

app.listen(PORT, () => {
    if (!TMDB_ACCESS_TOKEN) {
        console.error("Missing TMDB_ACCESS_TOKEN in .env");
    }

    console.log(`Movie API server running on port ${PORT}`);
});