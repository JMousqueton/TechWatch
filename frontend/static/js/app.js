// Utility function to add target="_blank" to all <a> tags in HTML
    function addTargetBlank(html) {
        if (!html) return html;
        // Add target="_blank" to all <a> tags that don't already have it
        return html.replace(/<a(?![^>]*target=)[^>]*href=/g, '<a target="_blank" href=');
    }
    // StatsPage: shows statistics and analytics
    const StatsPage = {
        template: `
            <div class="card" style="max-width: 700px; margin: 40px auto; padding-left: 40px;">
                <h3>📊 Statistics</h3>
                <div v-if="loading">Loading stats...</div>
                <div v-else>
                    <ul style="font-size: 1.1em;">
                        <li>Total Articles: {{ stats.totalArticles }}</li>
                        <li>Total Feeds: {{ stats.totalFeeds }}</li>
                        <li>Total Keywords: {{ stats.totalKeywords }}</li>
                    </ul>
                    <div v-if="keywordTrends && keywordTrends.length > 0" style="margin-top: 24px;">
                        <h3>🔑 Top Keywords</h3>
                        <ul style="font-size: 1.1em;">
                            <li v-for="kw in keywordTrends" :key="kw.keyword">
                                {{ kw.keyword }}: {{ kw.total_matches }}
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        `,
        props: ['api'],
        data() {
            return {
                stats: {
                    totalArticles: 0,
                    totalFeeds: 0,
                    totalKeywords: 0,
                    mostActiveFeed: null
                },
                mostReadArticles: [],
                keywordTrends: [],
                loading: true
            };
        },
        async mounted() {
            this.loading = true;
            try {
                const [feeds, keywords, articleCountRes, mostRead, keywordTrends] = await Promise.all([
                    this.api.getFeeds(),
                    this.api.getKeywords(),
                    this.api.getArticleCount(),
                    this.api.getMostReadArticles(),
                    this.api.getKeywordTrends()
                ]);
                let mostActiveFeed = null;
                if (feeds && feeds.length > 0) {
                    mostActiveFeed = feeds.reduce((max, f) => (f.article_count > (max?.article_count||0) ? f : max), feeds[0]);
                }
                this.stats = {
                    totalArticles: articleCountRes.count,
                    totalFeeds: feeds.length,
                    totalKeywords: keywords.length,
                    mostActiveFeed
                };
                this.mostReadArticles = mostRead;
                this.keywordTrends = keywordTrends;
            } catch (e) {
                alert('Failed to load stats: ' + e.message);
            } finally {
                this.loading = false;
            }
        }
    };
    // Chart.js injection removed
    // (removed duplicate data() and mounted() blocks)
    // ...existing code...
    // Chart.js injection removed
    // (removed duplicate data() and mounted() blocks)
    // ...existing code...
const { createApp } = Vue;


// API Service
import { baseURL } from './config.js';

const api = {
        // Users (admin only)
        getUsers() {
            return this.request('/users/');
        },
        createUser(user) {
            return this.request('/users/', {
                method: 'POST',
                body: JSON.stringify(user)
            });
        },
        updateUser(id, user) {
            return this.request(`/users/${id}/`, {
                method: 'PUT',
                body: JSON.stringify(user)
            });
        },
        deleteUser(id) {
            return this.request(`/users/${id}/`, { method: 'DELETE' });
        },
    getArticleCount() {
        return this.request('/articles/count');
    },
    getMostReadArticles(limit = 5) {
        return this.request(`/statistics/most_read_articles?limit=${limit}`);
    },
    getKeywordTrends(limit = 5) {
        return this.request(`/statistics/keyword_trends?limit=${limit}`);
    },
        updateFeed(id, data) {
            return this.request(`/feeds/${id}/`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },
    baseURL,
    token: localStorage.getItem('token') || null,

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            // Token expired or invalid: clear token and reload to login
            this.token = null;
            localStorage.removeItem('token');
            window.location.reload();
            // Stop further execution
            return;
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'API Error');
        }

        return data;
    },

    // Authentication
    login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },

    register(username, email, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
    },

    getConfig() {
        return this.request('/config/');
    },

    // Feeds
    getFeeds() {
        return this.request('/feeds/');
    },

    createFeed(feed) {
        return this.request('/feeds/', {
            method: 'POST',
            body: JSON.stringify(feed)
        });
    },

    deleteFeed(id) {
        return this.request(`/feeds/${id}/`, { method: 'DELETE' });
    },

    syncFeed(id) {
        return this.request(`/feeds/${id}/sync/`, { method: 'POST' });
    },

    // Keywords
    getKeywords() {
        return this.request('/keywords/');
    },

    createKeyword(keyword, weight = 1.0) {
        return this.request('/keywords/', {
            method: 'POST',
            body: JSON.stringify({ keyword, weight })
        });
    },

    updateKeyword(id, data) {
        return this.request(`/keywords/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    deleteKeyword(id) {
        return this.request(`/keywords/${id}/`, { method: 'DELETE' });
    },

    // Articles
    getArticles(feedId = null, isStarred = null, minScore = 0, sortBy = "score") {
        let url = `/articles/?limit=1000&min_score=${minScore}&sort_by=${sortBy}`;
        if (feedId) url += `&feed_id=${feedId}`;
        if (isStarred !== null) url += `&is_starred=${isStarred}`;
        return this.request(url);
    },

    searchArticles(query, feedId = null) {
        let url = `/articles/search/?limit=1000&query=${encodeURIComponent(query)}`;
        if (feedId) url += `&feed_id=${feedId}`;
        return this.request(url);
    },

    getArticle(id) {
        return this.request(`/articles/${id}/`);
    },

    likeArticle(id) {
        return this.request(`/articles/${id}/like/`, { method: 'POST' });
    },

    unlikeArticle(id) {
        return this.request(`/articles/${id}/unlike/`, { method: 'POST' });
    },

    starArticle(id) {
        return this.request(`/articles/${id}/star/`, { method: 'POST' });
    },

    unstarArticle(id) {
        return this.request(`/articles/${id}/unstar/`, { method: 'POST' });
    },

    deleteArticle(id) {
        return this.request(`/articles/${id}/`, { method: 'DELETE' });
    }
};

// Components
const LoginComponent = {
    template: `
        <div class="auth-container">
            <div class="auth-card">
                <h1>Tech Watch</h1>
                <div v-if="isLogin">
                    <h2 style="font-size: 20px; margin-bottom: 20px; text-align: center;">Login</h2>
                    <form @submit.prevent="handleLogin">
                        <div class="form-group">
                            <label>Username</label>
                            <input v-model="form.username" type="text" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input v-model="form.password" type="password" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Login</button>
                    </form>
                    <p style="text-align: center; margin-top: 20px;">
                        <span v-if="allowRegister">Don't have an account? 
                        <a href="#" @click.prevent="isLogin = false" style="color: var(--secondary-color);">Register</a></span>
                    </p>
                </div>
                <div v-else-if="allowRegister">
                    <h2 style="font-size: 20px; margin-bottom: 20px; text-align: center;">Register</h2>
                    <form @submit.prevent="handleRegister">
                        <div class="form-group">
                            <label>Username</label>
                            <input v-model="form.username" type="text" required>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input v-model="form.email" type="email" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input v-model="form.password" type="password" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Register</button>
                    </form>
                    <p style="text-align: center; margin-top: 20px;">
                        Already have an account? 
                        <a href="#" @click.prevent="isLogin = true" style="color: var(--secondary-color);">Login</a>
                    </p>
                </div>
                <div v-else style="text-align: center; margin-top: 20px; color: #7f8c8d;">
                    Registration is disabled.
                </div>
                <div v-if="error" style="color: var(--danger-color); margin-top: 15px; text-align: center;">
                    {{ error }}
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            isLogin: true,
            form: { username: '', email: '', password: '' },
            error: '',
            allowRegister: true
        };
    },
    async mounted() {
        try {
            const cfg = await api.getConfig();
            if (cfg && typeof cfg.allow_register !== 'undefined') this.allowRegister = cfg.allow_register;
        } catch (e) {
            console.warn('Could not fetch config:', e);
        }
    },
    methods: {
                        toggleRocketPopup(articleId) {
                            this.rocketPopupOpenId = this.rocketPopupOpenId === articleId ? null : articleId;
                        },
                        closeRocketPopup() {
                            this.rocketPopupOpenId = null;
                        },
                async deleteArticle(article) {
                    if (confirm(`Delete article "${article.title}"?`)) {
                        try {
                            await this.api.deleteArticle(article.id);
                            this.articles = this.articles.filter(a => a.id !== article.id);
                        } catch (e) {
                            alert('Failed to delete article.');
                        }
                    }
                },
        async handleLogin() {
            try {
                const res = await api.login(this.form.username, this.form.password);
                api.token = res.access_token;
                localStorage.setItem('token', res.access_token);
                this.$emit('login');
            } catch (err) {
                console.log('Login error:', err);
                this.error = err.message;
            }
        },
        async handleRegister() {
            try {
                await api.register(this.form.username, this.form.email, this.form.password);
                this.isLogin = true;
                this.error = '';
                this.form = { username: '', email: '', password: '' };
            } catch (err) {
                this.error = err.message;
            }
        }
    }
};

// Page Components - MUST BE DEFINED BEFORE DashboardComponent
const ArticlesPage = {
        computed: {
            newestSyncDateStyle() {
                if (!this.newestSyncDate) {
                    return { margin: '8px 0 18px 0', textAlign: 'right', color: '#1976d2', fontSize: '1.08em', fontWeight: 500 };
                }
                const now = new Date();
                const diffMs = now - this.newestSyncDate;
                const diffH = diffMs / (1000 * 60 * 60);
                let color = '#1976d2';
                if (diffH > 24) color = '#e74c3c'; // red
                else if (diffH > 12) color = '#ff9800'; // orange
                else if (diffH > 6) color = '#FFD600'; // yellow
                return { margin: '8px 0 18px 0', textAlign: 'right', color, fontSize: '1.08em', fontWeight: 500 };
            }
        },
    props: {
        api: { type: Object, required: true },
        selectedFeedId: { type: [Number, String], default: null }
    },
    template: `
        <div v-if="errorRibbon" class="feed-alert-ribbon" style="background:#e74c3c; color:white; text-align:center; font-weight:bold; position:sticky; top:0; z-index:1000; border-radius:0 0 8px 8px; margin-bottom:12px; min-height:36px; display:flex; align-items:center; justify-content:center;">
            <span style="flex:1; text-align:center;">{{ errorRibbon }}</span>
            <span style="position:absolute; right:24px; cursor:pointer; font-weight:normal;" @click="errorRibbon = ''">[X]</span>
        </div>
        <div>
            <div class="search-bar">
                <input v-model="searchQuery" placeholder="Search articles..." @keyup.enter="search">
                <button class="btn btn-primary" @click="search">Search</button>
                <button class="btn btn-primary" style="margin: 0 8px;" @click="toggleScoreFilter">{{ scoreFilterActive ? 'All Score' : 'Score > 0' }}</button>
                <button class="btn btn-success" @click="refreshArticles">Refresh</button>
                <select v-model="sortBy" @change="handleSortChange" style="padding: 8px; margin-left: 10px; border-radius: 4px; border: 1px solid #ddd;">
                    <option value="score">Sort by Score</option>
                    <option value="date">Sort by Date</option>
                </select>
            </div>
            <div v-if="newestSyncDate" style="margin: 8px 0 18px 0; text-align: right; font-size: 1.08em; font-weight: 500;">
                <i class="fas fa-sync-alt" style="margin-right:6px;"></i>
                Last feed sync: <span :style="{color: newestSyncDateStyle.color, fontWeight: 'bold'}">{{ formatDate(newestSyncDate) }}</span>
            </div>
    

            <div class="articles-container">
                <div v-if="articles.length === 0" style="text-align: center; color: #7f8c8d;">
                    No articles found. Try syncing feeds or adjusting filters.
                </div>
                <div v-for="article in articles" :key="article.id" class="article-item">
                    <div class="article-content">
                        <div class="article-title">
                                {{ article.title }}
                        </div>
                        <div class="article-meta">
                            <span class="feed-link" style="cursor:pointer; color:var(--primary-color); text-decoration:underline;" @click="filterByFeed(article.feed_id)">{{ article.feedName || 'Unknown Feed' }}</span> • {{ formatDate(article.published_date || article.created_at) }}
                        </div>
                        <div class="article-description" v-if="article.description" v-html="addTargetBlank(article.description)"></div>
                        <div class="article-description" v-else>{{ truncate(article.description, 200) }}</div>
                        <div class="article-score">
                            <span style="font-size: 13px; color: #333; font-weight: bold;">
                                Score: {{ article.total_score?.toFixed(1) || '0.0' }}
                                <span style="font-size: 12px; color: #7f8c8d;">
                                    (keyword: {{ article.keyword_score?.toFixed(1) || '0.0' }}
                                    + boost: {{ article.user_boost_score?.toFixed(1) || '0.0' }}
                                    - age penalty: {{ article.age_penalty?.toFixed(1) || '0.0' }})
                                </span>
                            </span>
                        </div>
                        <div class="article-actions">
                            <a :href="article.url" target="_blank">Read Full Article →</a>
                        </div>
                    </div>
                    <div class="article-sidebar" style="display:flex; flex-direction:column; align-items:center;">
                        <div style="display:flex; flex-direction:row; align-items:center; gap:16px;">
                            <span class="rocket-badge" style="background:#e0e0e0; color:#888; border-radius:6px; padding:2px 8px; display:flex; align-items:center; cursor:pointer; position:relative;" @click="toggleRocketPopup(article.id)">
                                <i class="fas fa-rocket" style="font-size:1.5em;"></i>
                                <div v-if="rocketPopupOpenId === article.id">
                                    <div style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.3); z-index:2000;" @click="closeRocketPopup()"></div>
                                    <div class="rocket-popup" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#fff; color:#333; border:1px solid #ccc; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.25); padding:32px 40px; z-index:2001; min-width:260px; text-align:center;">
                                        <b>Social Sharing</b><br>
                                        Share article ID {{ article.id }} on social networks!<br>
                                        <div style="margin: 24px 0 18px 0; display: flex; flex-direction: column; gap: 12px; align-items: center;">
                                            <a :href="'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(article.url)" target="_blank" rel="noopener" style="background:#1976d2; color:#fff; border:none; border-radius:6px; padding:10px 24px; font-size:1.1em; display:flex; align-items:center; gap:10px; cursor:pointer; min-width:180px; text-decoration:none;">
                                                <i class='fab fa-linkedin'></i> LinkedIn
                                            </a>
                                            <a :href="'https://twitter.com/intent/tweet?url=' + encodeURIComponent(article.url) + '&text=' + encodeURIComponent(article.title)" target="_blank" rel="noopener" style="background:#1976d2; color:#fff; border:none; border-radius:6px; padding:10px 24px; font-size:1.1em; display:flex; align-items:center; gap:10px; cursor:pointer; min-width:180px; text-decoration:none;">
                                                <i class='fab fa-x-twitter'></i> X (Twitter)
                                            </a>
                                            <a :href="'https://bsky.app/intent/compose?text=' + encodeURIComponent(article.title + ' ' + article.url)" target="_blank" rel="noopener" style="background:#1976d2; color:#fff; border:none; border-radius:6px; padding:10px 24px; font-size:1.1em; display:flex; align-items:center; gap:10px; cursor:pointer; min-width:180px; text-decoration:none;">
                                                <i class='fa fa-cloud'></i> Bluesky
                                            </a>
                                        </div>
                                        <button style="margin-top:0;" @click.stop="closeRocketPopup()">Close</button>
                                    </div>
                                </div>
                            </span>
                            <div class="score-badge">{{ article.total_score?.toFixed(1) || '0.0' }}</div>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:flex-end; width:100%; gap:16px;">
                            <span class="star-icon" :class="{ starred: article.isStarred }" @click="toggleStar(article)">
                                <i :class="['fa-star', article.isStarred ? 'fas' : 'far']" :style="article.isStarred ? 'color: #FFD600;' : 'color: #bbb;'"></i>
                            </span>
                            <span class="like-icon" :class="{ liked: article.isLiked }" @click="toggleLike(article)">
                                <i :class="['fa-heart', article.isLiked ? 'fas' : 'far']" :style="article.isLiked ? 'color: #e74c3c;' : 'color: #bbb;'"></i>
                            </span>
                            <span class="delete-icon" title="Delete Article" style="cursor:pointer; color:#e74c3c; font-size:20px; display:block; margin-top:6px;" @click="deleteArticle(article)">
                                <i class="fas fa-trash"></i>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="refreshing" class="global-spinner-overlay">
                <div class="global-spinner">
                    <i class="fa fa-spinner fa-spin fa-3x"></i>
                    <div style="margin-top: 12px; font-size: 1.1em; color: #333;">Refreshing articles...</div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            articles: [],
            searchQuery: '',
            sortBy: 'score',
            loading: false,
            scoreFilterActive: false,
            errorRibbon: '',
            localFeedId: this.selectedFeedId,
            rocketPopupOpenId: null,
            newestSyncDate: null,
            refreshing: false // <-- Added refreshing state
        };
    },
    watch: {
        selectedFeedId(newVal) {
            this.localFeedId = newVal;
            this.loadArticles();
        }
    },
    mounted() {
        this.loadArticles();
    },
    methods: {
        toggleRocketPopup(articleId) {
            this.rocketPopupOpenId = this.rocketPopupOpenId === articleId ? null : articleId;
        },
        closeRocketPopup() {
            this.rocketPopupOpenId = null;
        },
        addTargetBlank,
        handleSortChange() {
            this.loadArticles();
        },
            filterByFeed(feedId) {
                this.localFeedId = feedId;
                this.loadArticles();
            },
            toggleScoreFilter() {
                this.scoreFilterActive = !this.scoreFilterActive;
                this.loadArticles();
            },
        async deleteArticle(article) {
            console.log('deleteArticle called for', article);
            if (confirm(`Delete article "${article.title}"?`)) {
                try {
                    await this.api.deleteArticle(article.id);
                    this.articles = this.articles.filter(a => a.id !== article.id);
                } catch (e) {
                    alert('Failed to delete article.');
                }
            }
        },
            async loadArticles() {
                try {
                    const [articles, feeds] = await Promise.all([
                        this.api.getArticles(this.localFeedId, null, 0, this.sortBy),
                        this.api.getFeeds()
                    ]);
                    const feedMap = {};
                    let maxSync = null;
                    (feeds || []).forEach(f => {
                        feedMap[f.id] = f.name;
                        if (f.last_fetched) {
                            const d = new Date(f.last_fetched);
                            if (!maxSync || d > maxSync) maxSync = d;
                        }
                    });
                    this.newestSyncDate = maxSync;
                    let filteredArticles = articles || [];
                    if (this.scoreFilterActive) {
                        filteredArticles = filteredArticles.filter(a => (a.total_score || 0) > 0);
                    }
                    this.articles = filteredArticles.map(a => ({
                        ...a,
                        feedName: feedMap[a.feed_id] || 'Unknown Feed',
                        isStarred: a.is_starred || false,
                        isLiked: a.is_liked || false
                    }));
                } catch (err) {
                    alert(err.message);
                }
            },
        async search() {
            if (!this.searchQuery) {
                this.selectedFeedId = null;
                this.loadArticles();
                return;
            }
            try {
                const [articles, feeds] = await Promise.all([
                    this.api.searchArticles(this.searchQuery, this.selectedFeedId),
                    this.api.getFeeds()
                ]);
                const feedMap = {};
                (feeds || []).forEach(f => { feedMap[f.id] = f.name; });
                let filteredArticles = articles || [];
                if (this.scoreFilterActive) {
                    filteredArticles = filteredArticles.filter(a => (a.total_score || 0) > 0);
                }
                this.articles = filteredArticles.map(a => ({
                    ...a,
                    feedName: feedMap[a.feed_id] || 'Unknown Feed',
                    isStarred: a.is_starred || false,
                    isLiked: a.is_liked || false
                }));
            } catch (err) {
                alert(err.message);
            }
        },
        async refreshArticles() {
            this.searchQuery = '';
            this.localFeedId = null;
            this.scoreFilterActive = false;
            this.refreshing = true;
            // Sync all feeds before loading articles
            try {
                const feeds = await this.api.getFeeds();
                let errorMessages = [];
                await Promise.all((feeds || []).filter(feed => feed.is_active).map(async feed => {
                    try {
                        await this.api.syncFeed(feed.id);
                    } catch (err) {
                        errorMessages.push(`Feed ${feed.name}: ${err.message}`);
                    }
                }));
                if (errorMessages.length > 0) {
                    this.errorRibbon = errorMessages.join(' | ');
                }
                await this.loadArticles();
            } catch (err) {
                alert(err.message);
            } finally {
                this.refreshing = false;
            }
        },
        formatDate(date) {
            const d = new Date(date);
            return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        },
        truncate(text, length) {
            if (!text) return '';
            return text.length > length ? text.substring(0, length) + '...' : text;
        },
        async toggleStar(article) {
            try {
                if (article.isStarred) {
                    await this.api.unstarArticle(article.id);
                    article.isStarred = false;
                } else {
                    await this.api.starArticle(article.id);
                    article.isStarred = true;
                }
            } catch (err) {
                alert(err.message);
            }
        },
        async toggleLike(article) {
            try {
                if (article.isLiked) {
                    await this.api.unlikeArticle(article.id);
                    article.isLiked = false;
                    // remove boost
                    const boost = 5.0;
                    article.user_boost_score = Math.max(0, (article.user_boost_score || 0) - boost);
                    article.total_score = Math.max(0, (article.total_score || 0) - boost);
                } else {
                    const res = await this.api.likeArticle(article.id);
                    article.isLiked = true;
                    // apply boost (API may return boost value)
                    const boost = (res && res.boost) ? res.boost : 5.0;
                    article.user_boost_score = (article.user_boost_score || 0) + boost;
                    article.total_score = (article.total_score || 0) + boost;
                }
            } catch (err) {
                alert(err.message);
            }
        },
        consolidatedKeywords(keywords) {
            // Group keywords by name, sum match counts, and calculate per-occurrence score
            const grouped = {};
            (keywords || []).forEach(kw => {
                if (!grouped[kw.keyword]) {
                    grouped[kw.keyword] = { keyword: kw.keyword, match_count: 0, points: 0 };
                }
                grouped[kw.keyword].match_count += kw.match_count;
                grouped[kw.keyword].points += kw.points;
            });
            // Convert points to per-occurrence value
            return Object.values(grouped).map(kw => ({
                ...kw,
                points: kw.points / kw.match_count
            }));
        }
    }
};

const FeedsPage = {
    template: `
        <div>
            <div v-if="feeds.some(f => f.health === 'stale' || f.health === 'broken')" class="feed-alert-ribbon">
                <span style="color:white; font-weight:bold;">⚠️ Some feeds are stale or broken and may need your attention!</span>
            </div>
                <div class="card" style="margin-bottom: 16px;">
                    <h3>Add Google News Feed</h3>
                    <form @submit.prevent="addGoogleNewsFeed">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Name</label>
                                <input v-model="googleNews.name" placeholder="e.g., Google News AI" required>
                            </div>
                            <div class="form-group">
                                <label>Keywords</label>
                                <input v-model="googleNews.keywords" placeholder="e.g., AI, Machine Learning" required>
                            </div>
                            <div class="form-group">
                                <label>Country</label>
                                <select v-model="googleNews.country" required>
                                    <option value="FR">France</option>
                                    <option value="UK">United Kingdom</option>
                                    <option value="DE">Germany</option>
                                    <option value="CA">Canada</option>
                                    <option value="US">USA</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary btn-small"><i class="fa fa-plus"></i> Add Google News Feed</button>
                    </form>
                </div>
            <div class="card">
                <h3>Add New Feed</h3>
                <form @submit.prevent="addFeed">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Feed Name</label>
                            <input v-model="newFeed.name" placeholder="e.g., HackerNews" required>
                        </div>
                        <div class="form-group">
                            <label>URL</label>
                            <input v-model="newFeed.url" placeholder="https://..." required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Type</label>
                            <select v-model="newFeed.feedType">
                                <option value="rss">RSS Feed</option>
                                <!-- <option value="scraper">Web Scraper</option> -->
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Description (optional)</label>
                            <input v-model="newFeed.description" placeholder="Description...">
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">Add Feed</button>
                </form>
            </div>

            <div class="card">
                <h3>Your Feeds</h3>
                <div class="card" style="margin-bottom: 16px; display: flex; gap: 12px; align-items: center;">
                    <button class="btn btn-primary btn-small" @click="exportOPML" style="margin-bottom: 0;">
                        <i class="fa-solid fa-floppy-disk"></i> Export OPML
                    </button>
                    <label class="btn btn-primary btn-small" style="margin-bottom: 0; display: inline-block; cursor: pointer;">
                        <i class="fa-solid fa-file-import"></i> Import OPML
                        <input type="file" accept=".xml,.opml" @change="importOPML" style="display:none;">
                    </label>
                </div>
                <table v-if="feeds.length > 0">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Articles</th>
                            <th>Last Synced</th>
                            <th>Status</th>
                            <th>Autostarred</th>
                            <th>Health</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="feed in feeds" :key="feed.id">
                            <td>
                                <span class="feed-link" style="cursor:pointer; color:var(--primary-color); text-decoration:underline;" @click="$emit('show-articles-for-feed', feed.id)">{{ feed.name }}</span>
                            </td>
                            <td>{{ feed.feed_type }}</td>
                            <td>{{ feed.article_count }}</td>
                            <td>{{ feed.last_fetched ? formatDate(feed.last_fetched) : 'Never' }}</td>
                            <td>
                                <label class="switch">
                                    <input type="checkbox" v-model="feed.is_active" @change="toggleFeedStatus(feed)">
                                    <span class="slider round"></span>
                                </label>
                                <span style="margin-left:8px; color: var(--success-color);">{{ feed.is_active ? 'Active' : 'Inactive' }}</span>
                            </td>
                            <td>
                                <label class="switch">
                                    <input type="checkbox" v-model="feed.autostarred" @change="toggleAutostarred(feed)">
                                    <span class="slider round"></span>
                                </label>
                                <span style="margin-left:8px; color: #1976d2;">{{ feed.autostarred ? 'On' : 'Off' }}</span>
                            </td>
                            <td>
                                <span v-if="feed.last_sync_status === 'success'" style="color: #27ae60; font-weight: bold;">Healthy</span>
                                <span v-else-if="feed.last_sync_status === 'failed'" style="background:#e74c3c; color:white; border-radius:4px; padding:2px 10px; font-weight:bold; font-size:0.95em;">ERR</span>
                                <span v-else>{{ feed.last_sync_status || 'unknown' }}</span>
                            </td>
                            <td style="display:flex; gap:8px; align-items:center;">
                                <button class="btn btn-small btn-primary" @click="syncFeed(feed)" :disabled="syncingFeedId === feed.id">
                                    <span v-if="syncingFeedId === feed.id">
                                        <i class="fa fa-spinner fa-spin"></i> Syncing...
                                    </span>
                                    <span v-else>
                                        Sync
                                    </span>
                                </button>
                                <button class="btn btn-small btn-danger" @click="deleteFeed(feed)">Delete</button>
                                <button class="btn btn-small" style="background:#e74c3c; color:white;" title="Reinitialize Feed" @click="reinitFeed(feed)"><i class="fa-solid fa-recycle"></i></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div v-else style="text-align: center; color: #7f8c8d;">No feeds configured yet.</div>
            </div>

            <div v-if="syncingFeedId !== null" class="global-spinner-overlay">
                <div class="global-spinner">
                    <i class="fa fa-spinner fa-spin fa-3x"></i>
                    <div style="margin-top: 12px; font-size: 1.1em; color: #333;">Syncing feed...</div>
                </div>
            </div>
        </div>
    `,
    props: ['api'],
    data() {
        return {
            feeds: [],
            newFeed: { name: '', url: '', feedType: 'rss', description: '', autostarred: false },
            syncingFeedId: null // Track which feed is syncing
                ,
                googleNews: { name: '', keywords: '', country: 'FR' }
        };
    },
    mounted() {
        this.loadFeeds();
    },
    methods: {
            async addGoogleNewsFeed() {
                // Validate fields
                if (!this.googleNews.name || !this.googleNews.keywords || !this.googleNews.country) {
                    showToast('Please fill all Google News fields.', 'error');
                    return;
                }
                // Map country to language and ceid
                // Correct mapping for hl and ceid for Google News
                const countryMap = {
                    'FR': { hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
                    'UK': { hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },
                    'DE': { hl: 'de-DE', gl: 'DE', ceid: 'DE:de' },
                    'CA': { hl: 'en-CA', gl: 'CA', ceid: 'CA:en' },
                    'US': { hl: 'en-US', gl: 'US', ceid: 'US:en' }
                };
                const c = countryMap[this.googleNews.country] || countryMap['FR'];
                // Format keywords for URL
                const keywords = '"' + this.googleNews.keywords.trim().split(/\s*,\s*|\s+/).join('+') + '"';
                const url = `https://news.google.com/rss/search?q=${keywords}&hl=${c.hl}&gl=${c.gl}&ceid=${c.ceid}`;
                try {
                    await this.api.createFeed({
                        name: this.googleNews.name,
                        url,
                        feed_type: 'rss',
                        description: `Google News feed for: ${this.googleNews.keywords}`,
                        autostarred: false
                    });
                    this.googleNews = { name: '', keywords: '', country: 'FR' };
                    showToast('Google News feed added!', 'success');
                    this.loadFeeds();
                } catch (err) {
                    showToast('Failed to add Google News feed: ' + err.message, 'error');
                }
            },
        // ...existing code...
        async reinitFeed(feed) {
            if (!confirm(`Reinitialize feed '${feed.name}'? This will reset its sync state and fetch all articles on next sync.`)) return;
            try {
                // Use a very old date to force a reset, or try empty string if backend handles it
                await this.api.updateFeed(feed.id, { last_fetched: "1970-01-01T00:00:00Z" });
                alert('Feed reinitialized. Next sync will fetch all articles.');
                this.loadFeeds();
            } catch (err) {
                alert('Failed to reinitialize feed: ' + err.message);
            }
        },
        // ...existing code...
        async toggleFeedStatus(feed) {
            try {
                await this.api.updateFeed(feed.id, { is_active: feed.is_active });
            } catch (err) {
                alert('Failed to update feed status: ' + err.message);
                // Revert UI if error
                feed.is_active = !feed.is_active;
            }
        },
        getFeedHealth(feed) {
            return feed.last_sync_status;
        },
        getFeedHealthColor(feed) {
            if (feed.health === 'broken') return 'red';
            const health = this.getFeedHealth(feed);
            if (health === 'Healthy') return 'green';
            if (health === 'Warning') return 'orange';
            if (health === 'Stale') return 'red';
            return '#888';
        },
        async loadFeeds() {
            try {
                this.feeds = await this.api.getFeeds();
            } catch (err) {
                alert(err.message);
            }
        },
        async addFeed() {
            try {
                await this.api.createFeed({
                    name: this.newFeed.name,
                    url: this.newFeed.url,
                    feed_type: this.newFeed.feedType,
                    description: this.newFeed.description,
                    autostarred: this.newFeed.autostarred
                });
                this.newFeed = { name: '', url: '', feedType: 'rss', description: '', autostarred: false };
                showToast('Feed added!', 'success');
                this.loadFeeds();
            } catch (err) {
                showToast(err.message, 'error');
            }
        },
        async toggleAutostarred(feed) {
            try {
                await this.api.updateFeed(feed.id, { autostarred: feed.autostarred });
                showToast('Autostarred updated!', 'success');
            } catch (err) {
                showToast('Failed to update autostarred: ' + err.message, 'error');
                feed.autostarred = !feed.autostarred;
            }
        },
        async syncFeed(feed) {
            if (!feed.is_active) {
                showToast('Feed is disabled. Enable it to sync.', 'error');
                return;
            }
            this.syncingFeedId = feed.id;
            try {
                await this.api.syncFeed(feed.id);
                showToast('Feed synced successfully!', 'success');
                this.loadFeeds();
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                this.syncingFeedId = null;
            }
        },
        async deleteFeed(feed) {
            if (confirm(`Delete feed "${feed.name}"?`)) {
                try {
                    await this.api.deleteFeed(feed.id);
                    showToast('Feed deleted!', 'success');
                    this.loadFeeds();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            }
        },
        formatDate(date) {
            const d = new Date(date);
            return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        },
        async exportOPML() {
            // Create an OPML string from the current feeds
            const opmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
<head>
  <title>OPML Export</title>
</head>
<body>
`;

            const opmlFooter = `
</body>
</opml>
`;

            const feedLines = (this.feeds || []).map(feed => {
                return `  <outline type="rss" text="${feed.name}" title="${feed.name}" xmlUrl="${feed.url}" htmlUrl="${feed.url}" />`;
            }).join('\n');

            const opmlContent = opmlHeader + feedLines + '\n' + opmlFooter;

            // Create a blob and download it
            const blob = new Blob([opmlContent], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'feeds.opml';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        async importOPML(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                const contents = e.target.result;
                // Parse the OPML XML
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(contents, 'text/xml');
                const outlineEls = xmlDoc.getElementsByTagName('outline');

                const feeds = [];
                for (let i = 0; i < outlineEls.length; i++) {
                    const el = outlineEls[i];
                    const type = el.getAttribute('type');
                    if (type === 'rss') {
                        const url = el.getAttribute('xmlUrl');
                        const title = el.getAttribute('title') || el.getAttribute('text');
                        if (url) {
                            feeds.push({ name: title, url, feed_type: 'rss' });
                        }
                    }
                }

                // Bulk create feeds via API
                try {
                    await Promise.all(feeds.map(feed => this.api.createFeed(feed)));
                    showToast('Feeds imported successfully!', 'success');
                    this.loadFeeds();
                } catch (err) {
                    showToast('Error importing feeds: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        }
    }
};

const KeywordsPage = {
    template: `
        <div>
            <div class="card">
                <h3>Add Keyword</h3>
                <form @submit.prevent="addKeyword">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Keyword</label>
                            <input v-model="newKeyword.keyword" placeholder="e.g., AI, Machine Learning" required>
                        </div>
                        <div class="form-group">
                            <label>Point(s) for 1st match</label>
                            <input v-model.number="newKeyword.weight" type="number" min="0.1" step="0.1" value="1.0" required>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">Add Keyword</button>
                </form>
            </div>

            <div style="display: flex; gap: 24px; align-items: flex-start;">
                <div class="card" style="flex:1;">
                    <h3>Your Keywords</h3>
                    <table v-if="keywords.length > 0">
                        <thead>
                            <tr>
                                <th>Keyword</th>
                                <th>Point(s)</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="keyword in sortedKeywords" :key="keyword.id">
                                <td>{{ keyword.keyword }}</td>
                                <td style="text-align:center;">{{ keyword.weight }}</td>
                                <td><span style="color: var(--success-color);">{{ keyword.is_active ? 'Active' : 'Inactive' }}</span></td>
                                <td>
                                    <button class="btn btn-small btn-danger" @click="deleteKeyword(keyword)">Delete</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div v-else style="text-align: center; color: #7f8c8d;">No keywords configured yet.</div>
                </div>
                <div class="card" style="flex:1; min-width:320px; background:#f9f9f9;">
                    <h3>How Article Score is Calculated</h3>
                    <ul style="font-size:1em; line-height:1.7; margin-left:18px;">
                            <li>Each <b>active keyword</b> found in an article adds points to its score.</li>
                            <li>Points per match = <b>keyword weight</b> (set above).</li>
                            <li>First occurrence of a keyword: <b>weight</b> points.</li>
                            <li>Each additional occurrence: <b>+0.5</b> points.</li>
                            <li>Score = sum of all keyword matches in title, description, and content.</li>
                            <li>Likes add <b>+5</b> points (user boost).</li>
                            <li>Age penalty: <b>-0.5</b> points every 2 days since publication (can make score negative).</li>
                            <li>Final Score = keyword points + boost - age penalty.</li>
                            <li>Starred articles are not scored higher, but are bookmarked for you.</li>
                    </ul>
                </div>
            </div>
        </div>
    `,
    props: ['api'],
    data() {
        return {
            keywords: [],
            newKeyword: { keyword: '', weight: 1.0 }
        };
    },
    computed: {
        sortedKeywords() {
            return [...this.keywords].sort((a, b) => a.keyword.localeCompare(b.keyword, undefined, { sensitivity: 'base' }));
        }
    },
    mounted() {
        this.loadKeywords();
    },
    methods: {
        async loadKeywords() {
            try {
                this.keywords = await this.api.getKeywords();
            } catch (err) {
                alert(err.message);
            }
        },
        async addKeyword() {
            try {
                await this.api.createKeyword(this.newKeyword.keyword, this.newKeyword.weight);
                this.newKeyword = { keyword: '', weight: 1.0 };
                this.loadKeywords();
            } catch (err) {
                alert(err.message);
            }
        },
        async deleteKeyword(keyword) {
            if (confirm(`Delete keyword "${keyword.keyword}"?`)) {
                try {
                    await this.api.deleteKeyword(keyword.id);
                    this.loadKeywords();
                } catch (err) {
                    alert(err.message);
                }
            }
        }
    }
};

const StarredPage = {
    template: `
        <div>
            <div class="search-bar">
                <input v-model="searchQuery" placeholder="Search articles..." @keyup.enter="search">
                <button class="btn btn-primary" @click="search">Search</button>
                <button class="btn btn-success" @click="refreshArticles">Refresh</button>
                <select v-model="sortBy" @change="loadArticles" style="padding: 8px; margin-left: 10px; border-radius: 4px; border: 1px solid #ddd;">
                    <option value="score">Sort by Score</option>
                    <option value="date">Sort by Date</option>
                </select>
            </div>

            <div class="articles-container">
                <div v-if="articles.length === 0" style="text-align: center; color: #7f8c8d;">No starred articles yet.</div>
                <div v-for="article in articles" :key="article.id" class="article-item">
                    <div class="article-content">
                        <div class="article-title">{{ article.title }}</div>
                        <div class="article-meta" style="color: #7f8c8d;">
                            <span class="feed-link" style="cursor:pointer; color:var(--primary-color); text-decoration:underline;" @click="filterByFeed(article.feed_id)">{{ article.feedName || 'Unknown Feed' }}</span>
                            • {{ formatDate(article.published_date || article.created_at) }}
                        </div>
                        <div class="article-description" v-if="article.description" v-html="addTargetBlank(article.description)"></div>
                        <div class="article-description" v-else>{{ truncate(article.description, 200) }}</div>
                        <div class="article-score">
                            Score: {{ article.total_score?.toFixed(1) || '0.0' }}
                            <span style="font-size: 12px; color: #7f8c8d;">
                                <span class="keyword-tooltip">
                                    (keyword: {{ article.keyword_score?.toFixed(1) || '0.0' }})
                                    <div class="tooltip-content" v-if="article.keywords && article.keywords.length > 0">
                                        <div class="keyword-list">
                                            <div v-for="(kw, idx) in consolidatedKeywords(article.keywords)" :key="idx" class="keyword-item">
                                                <span class="keyword-name">{{ kw.keyword }} ({{ kw.match_count }}):</span>
                                                <span class="keyword-score">{{ kw.points.toFixed(1) }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </span>
                                + boost: {{ article.user_boost_score?.toFixed(1) || '0.0' }}
                            </span>
                        </div>
                        <div class="article-actions">
                            <a :href="article.url" target="_blank">Read Full Article →</a>
                        </div>
                    </div>
                    <div class="article-sidebar">
                        <div class="score-badge">{{ article.total_score?.toFixed(1) || '0.0' }}</div>
                        <span class="star-icon" :class="{ starred: article.isStarred }" @click="toggleStar(article)">★</span>
                        <span class="like-icon" :class="{ liked: article.isLiked }" @click="toggleLike(article)">♥</span>
                        <span class="delete-icon" title="Delete Article" style="cursor:pointer; color:#e74c3c; font-size:20px; display:block; margin-top:6px;" @click="deleteArticle(article)">
                            <i class="fas fa-trash"></i>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: ['api'],
    data() {
        return {
            articles: [],
            sortBy: 'score',
            searchQuery: '',
            selectedFeedId: null
        };
    },
    mounted() {
        this.loadArticles();
    },
    methods: {
        addTargetBlank,
        filterByFeed(feedId) {
            this.selectedFeedId = feedId;
            this.loadArticles();
        },
        async loadArticles() {
            try {
                const [articles, feeds] = await Promise.all([
                    this.api.getArticles(this.selectedFeedId, true, 0, this.sortBy),
                    this.api.getFeeds()
                ]);
                const feedMap = {};
                (feeds || []).forEach(f => { feedMap[f.id] = f.name; });
                let filteredArticles = articles || [];
                if (this.searchQuery) {
                    filteredArticles = filteredArticles.filter(a =>
                        (a.title && a.title.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
                        (a.description && a.description.toLowerCase().includes(this.searchQuery.toLowerCase()))
                    );
                }
                this.articles = filteredArticles.map(a => ({
                    ...a,
                    feedName: feedMap[a.feed_id] || 'Unknown Feed',
                    isStarred: a.is_starred || false,
                    isLiked: a.is_liked || false
                }));
            } catch (err) {
                alert(err.message);
            }
        },
        async search() {
            this.selectedFeedId = null;
            this.loadArticles();
        },
        async refreshArticles() {
            await this.loadArticles();
        },
        formatDate(date) {
            const d = new Date(date);
            return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        },
        truncate(text, length) {
            if (!text) return '';
            return text.length > length ? text.substring(0, length) + '...' : text;
        },
        async toggleStar(article) {
            try {
                if (article.isStarred) {
                    await this.api.unstarArticle(article.id);
                    // remove from list
                    this.articles = this.articles.filter(a => a.id !== article.id);
                } else {
                    await this.api.starArticle(article.id);
                    article.isStarred = true;
                }
            } catch (err) {
                alert(err.message);
            }
        },
        async toggleLike(article) {
            try {
                if (article.isLiked) {
                    await this.api.unlikeArticle(article.id);
                    article.isLiked = false;
                    const boost = 5.0;
                    article.user_boost_score = Math.max(0, (article.user_boost_score || 0) - boost);
                    article.total_score = Math.max(0, (article.total_score || 0) - boost);
                } else {
                    const res = await this.api.likeArticle(article.id);
                    article.isLiked = true;
                    const boost = (res && res.boost) ? res.boost : 5.0;
                    article.user_boost_score = (article.user_boost_score || 0) + boost;
                    article.total_score = (article.total_score || 0) + boost;
                }
            } catch (err) {
                alert(err.message);
            }
        },
        async deleteArticle(article) {
            if (confirm(`Delete article "${article.title}"?`)) {
                try {
                    await this.api.deleteArticle(article.id);
                    this.articles = this.articles.filter(a => a.id !== article.id);
                } catch (e) {
                    alert('Failed to delete article.');
                }
            }
        },
        consolidatedKeywords(keywords) {
            const grouped = {};
            (keywords || []).forEach(kw => {
                if (!grouped[kw.keyword]) grouped[kw.keyword] = { keyword: kw.keyword, match_count: 0, points: 0 };
                grouped[kw.keyword].match_count += kw.match_count;
                grouped[kw.keyword].points += kw.points;
            });
            return Object.values(grouped).map(kw => ({ ...kw, points: kw.points / kw.match_count }));
        }
    }
};

// AboutPage: Information about the product
const AboutPage = {
    template: `
        <div style="max-width: 800px; margin: 40px auto; padding: 0 0 32px 0;">
            <div style="background: linear-gradient(90deg, #1976d2 0%, #42a5f5 100%); color: #fff; border-radius: 18px 18px 0 0; padding: 36px 40px 28px 40px; box-shadow: 0 4px 24px rgba(25, 118, 210, 0.10); text-align: center;">
                <div style="font-size: 2.6em; font-weight: bold; letter-spacing: 1px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 16px;">
                    <span><i class='fas fa-info-circle' style='font-size:1.2em;'></i></span>
                    About <span style="color: #FFD600;">Tech Watch</span>
                </div>
                <div style="font-size: 1.25em; margin-bottom: 8px;">Open-source technology news & feed aggregator</div>
                <div style="font-size: 1.1em; opacity: 0.92;">Monitor, filter, and discover the latest articles from your favorite sources.</div>
            </div>
            <div style="background: #fff; border-radius: 0 0 18px 18px; box-shadow: 0 4px 24px rgba(25, 118, 210, 0.08); padding: 32px 40px 24px 40px;">
                <div style="display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start; justify-content: space-between;">
                    <div style="flex: 1 1 220px; min-width: 220px;">
                        <h3 style="color: #1976d2; margin-bottom: 10px;"><i class="fas fa-user"></i> Author</h3>
                        <div style="background: #f5f7fa; border-radius: 8px; padding: 16px 18px; font-size: 1.1em; margin-bottom: 18px;">
                            <b>Julien Mousqueton</b> <span style="color:#888;"></span>
                        </div>
                        <h3 style="color: #1976d2; margin-bottom: 10px;"><i class="fas fa-code-branch"></i> Source Code</h3>
                        <div style="background: #f5f7fa; border-radius: 8px; padding: 12px 18px;">
                            <a href="https://github.com/jmousqueton/techwatch" target="_blank" style="color:#1976d2; font-weight:bold; text-decoration:none;">
                                <i class="fab fa-github"></i> github.com/julien-mousqueton/techwatch
                            </a>
                        </div>
                    </div>
                    <div style="flex: 2 1 340px; min-width: 320px;">
                        <h3 style="color: #1976d2; margin-bottom: 10px;"><i class="fas fa-star"></i> Key Features</h3>
                        <ul style="font-size:1.13em; line-height:1.8; margin-left:18px;">
                            <li><i class="fas fa-rss" style="color:#1976d2;"></i> Feed aggregation & health monitoring</li>
                            <li><i class="fas fa-key" style="color:#1976d2;"></i> Keyword-based article scoring & filtering</li>
                            <li><i class="fas fa-star" style="color:#FFD600;"></i> Star & like articles for quick access</li>
                            <li><i class="fas fa-hourglass-half" style="color:#1976d2;"></i> Age-based score decay (with negative scores)</li>
                            <li><i class="fas fa-tools" style="color:#1976d2;"></i> Admin tools for feed & user management</li>
                            <li><i class="fas fa-chart-line" style="color:#1976d2;"></i> Statistics & keyword trends</li>
                            <li><i class="fas fa-share-alt" style="color:#1976d2;"></i> Social sharing & modern UI</li>
                            <li><i class="fas fa-code" style="color:#1976d2;"></i> Open-source, extensible, & user-friendly</li>
                        </ul>
                    </div>
                </div>
                <div style="margin-top: 36px; text-align: center; color: #888; font-size: 1.05em;">
                    <i class="fas fa-heart" style="color:#e74c3c;"></i> Thank you for using Tech Watch!
                </div>
            </div>
        </div>
    `
};

// Toast notification system
let toastTimeout = null;
function showToast(message, type = 'success', duration = 3000) {
    let toast = document.getElementById('global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast';
        toast.className = 'global-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'global-toast ' + (type === 'error' ? 'toast-error' : 'toast-success');
    toast.style.display = 'block';
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.style.display = 'none';
    }, duration);
}

// DashboardComponent - DEFINED AFTER page components
// AdminPage: simple admin UI with rescore button
// AdminPage is defined above (kept before DashboardComponent)

const DashboardComponent = {
    template: `
        <div style="display: flex; height: 100vh;">
            <div class="sidebar" style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
                <div>
                    <h1>Tech Watch</h1>
                    <ul class="nav-menu">
                        <li><a href="#" @click.prevent="currentPage = 'articles'" :class="{ active: currentPage === 'articles' }">📰 Articles</a></li>
                        <li><a href="#" @click.prevent="currentPage = 'feeds'" :class="{ active: currentPage === 'feeds' }">📡 Feeds</a></li>
                        <li><a href="#" @click.prevent="currentPage = 'keywords'" :class="{ active: currentPage === 'keywords' }">🔍 Keywords</a></li>
                        <li><a href="#" @click.prevent="handleStarredClick" :class="{ active: currentPage === 'starred' }">⭐ Starred<span v-if="starredCount !== null"> ({{ starredCount }})</span></a></li>
                        <li><a href="#" @click.prevent="currentPage = 'stats'" :class="{ active: currentPage === 'stats' }">📊 Stats</a></li>
                        <li v-if="isAdmin"><a href="#" @click.prevent="currentPage = 'admin'" :class="{ active: currentPage === 'admin' }">🛠 Admin</a></li>
                        <li v-if="isAdmin"><a href="#" @click.prevent="currentPage = 'about'" :class="{ active: currentPage === 'about' }">ℹ️ About</a></li>
                    </ul>
                </div>
                <div style="text-align: center; font-size: 12px; color: #888; margin-bottom: 12px;">
                    &copy; Julien Mousqueton 2025-{{ new Date().getFullYear() }}
                </div>
            </div>
            <div class="main-content" style="flex:1; display:flex; flex-direction:column; min-width:0;">
                <div class="header" style="position:fixed; left:0; top:0; width:100vw; z-index:100; background:#f8f9fa; display:flex; align-items:center; justify-content:space-between; padding: 0 32px 0 24px; min-height:60px; box-sizing:border-box; border-bottom:1px solid #e0e0e0;">
                    <div style="display:flex; align-items:center; gap:64px;">
                        <span style="font-weight:bold; font-size:1.5em; color:#1976d2; letter-spacing:1px;">Tech Watch</span>
                        <h2 style="margin:0;">{{ pageTitle }}</h2>
                        <span>Welcome, {{ username }}!</span>
                    </div>
                    <button class="logout-btn" @click="logout">Logout</button>
                </div>
                <div style="height:60px;"></div>
                <div class="content" style="flex:1; min-width:0;">
                        <ArticlesPage v-if="currentPage === 'articles'" :api="api" :selectedFeedId="articlesFeedId" ref="articlesPage" />
                        <FeedsPage v-else-if="currentPage === 'feeds'" :api="api" @show-articles-for-feed="showArticlesForFeed" />
                        <KeywordsPage v-else-if="currentPage === 'keywords'" :api="api" />
                        <StarredPage v-else-if="currentPage === 'starred'" :api="api" />
                        <StatsPage v-else-if="currentPage === 'stats'" :api="api" />
                        <AdminPage v-else-if="currentPage === 'admin'" :api="api" />
                        <AboutPage v-else-if="currentPage === 'about'" />
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            currentPage: 'articles',
            username: 'login',
            api: api,
            isAdmin: false,
            starredCount: null,
            articlesFeedId: null
        };
    },
    methods: {
        logout() {
            api.token = null;
            localStorage.removeItem('token');
            this.$emit('logout');
        },
        async fetchStarredCount() {
            try {
                const res = await api.getArticles(null, true);
                this.starredCount = Array.isArray(res) ? res.length : (res?.results?.length || 0);
            } catch (e) {
                this.starredCount = 0;
            }
        },
        async handleStarredClick() {
            await this.fetchStarredCount();
            this.currentPage = 'starred';
        },
        showArticlesForFeed(feedId) {
            this.articlesFeedId = feedId;
            this.currentPage = 'articles';
        }
    },
    async mounted() {
        // fetch current user info if logged in
        if (api.token) {
            try {
                const user = await api.request('/auth/me');
                if (user && user.username) this.username = user.username;
                if (user && user.is_admin) this.isAdmin = true;
            } catch (e) {
                console.warn('Could not fetch current user:', e);
                console.log('Dashboard /auth/me error:', e);
            }
        }
        this.fetchStarredCount();
    },
    computed: {
        pageTitle() {
            const titles = {
                articles: '📰 Latest Articles ',
                feeds: '📡 Manage Feeds ',
                keywords: '🔍 Keywords ',
                starred: '⭐ Starred Articles ',
                stats: '📊 Statistics ',
                admin: '🛠 Admin Console ',
                about: 'ℹ️ About'
            };
            return titles[this.currentPage] || 'Dashboard';
        }
    },
    components: {
	ArticlesPage,
	FeedsPage,
	KeywordsPage,
	StarredPage,
	StatsPage,
	AboutPage
	// AdminPage
    }
}

// AdminPage: admin tools + Users tab
const AdminPage = {
    template: `
        <div style="padding: 20px;">
            <div style="margin-bottom: 24px;">
                <button class="btn btn-primary" @click="tab = 'tools'" :class="{active: tab==='tools'}">Admin Tools</button>
                <button class="btn btn-primary" @click="tab = 'users'" :class="{active: tab==='users'}" style="margin-left:12px;">Users</button>
            </div>
            <div v-if="tab === 'tools'">
                <p>Dangerous operations are restricted to admins.</p>
                <p><br></p>
                <button class="btn btn-success" @click="rescoreAll" :disabled="running">Rescore All Articles</button>
                <div style="margin-top: 20px;">
                    <label>Purge articles older than
                        <select v-model="purgeDays" style="margin: 0 8px;">
                            <option v-for="d in [1,7,15,30,90]" :key="d" :value="d">{{ d }} days</option>
                        </select>
                    </label>
                    <button class="btn btn-danger" @click="purgeArticles" :disabled="running">Purge</button>
                </div>
                <div v-if="running" style="margin-top:10px;">Running... {{ progress }}</div>
                <div v-if="result" style="margin-top:10px;">Rescored: {{ result.rescored_articles }}; Errors: {{ result.errors.length }}</div>
                <div v-if="purgeResult" style="margin-top:10px;">Purged: {{ purgeResult.purged_articles || 0 }} articles</div>
            </div>
            <div v-else-if="tab === 'users'">
                <div class="card" style="max-width:900px; margin:auto;">
                    <h3>Users Management</h3>
                    <button class="btn btn-success" @click="showCreate = !showCreate" style="margin-bottom:12px;">{{ showCreate ? 'Cancel' : 'Add User' }}</button>
                    <form v-if="showCreate" @submit.prevent="createUser" style="margin-bottom:18px;">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Username</label>
                                <input v-model="newUser.username" required>
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input v-model="newUser.email" type="email" required>
                            </div>
                            <div class="form-group">
                                <label>Password</label>
                                <input v-model="newUser.password" type="password" required>
                            </div>
                        </div>
                        <button class="btn btn-primary" type="submit">Create User</button>
                    </form>
                    <table v-if="users.length > 0">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Active</th>
                                <th>Admin</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="user in users" :key="user.id">
                                <td>{{ user.id }}</td>
                                <td v-if="editId !== user.id">{{ user.username }}</td>
                                <td v-else><input v-model="editUser.username"></td>
                                <td v-if="editId !== user.id">{{ user.email }}</td>
                                <td v-else><input v-model="editUser.email"></td>
                                <td>{{ user.is_active ? 'Yes' : 'No' }}</td>
                                <td v-if="editId !== user.id">
                                    <label class="switch" style="vertical-align:middle; opacity:0.6; cursor:not-allowed;">
                                        <input type="checkbox" :checked="user.is_admin" disabled>
                                        <span class="slider"></span>
                                    </label>
                                </td>
                                <td v-else>
                                    <label class="switch" style="vertical-align:middle;">
                                        <input type="checkbox" v-model="editUser.is_admin">
                                        <span class="slider"></span>
                                    </label>
                                    <span style="margin-left:8px; color: var(--success-color); font-weight:bold;">{{ editUser.is_admin ? 'Yes' : 'No' }}</span>
                                </td>
                                <td>{{ user.created_at }}</td>
                                <td>
                                    <button class="btn btn-small btn-primary" v-if="editId !== user.id" @click="startEdit(user)">Edit</button>
                                    <button class="btn btn-small btn-success" v-else @click="saveEdit(user)">Save</button>
                                    <button class="btn btn-small btn-danger" @click="deleteUser(user)">Delete</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div v-else style="color:#888; text-align:center;">No users found.</div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            tab: 'tools',
            running: false, progress: '', result: null, purgeDays: 30, purgeResult: null,
            users: [], showCreate: false, newUser: { username: '', email: '', password: '' },
            editId: null, editUser: { username: '', email: '', password: '' }
        };
    },
    mounted() {
        this.loadUsers();
    },
    methods: {
        async loadUsers() {
            try {
                this.users = await api.getUsers();
            } catch (e) {
                this.users = [];
            }
        },
        async createUser() {
            try {
                await api.createUser(this.newUser);
                this.showCreate = false;
                this.newUser = { username: '', email: '', password: '' };
                this.loadUsers();
            } catch (e) {
                alert(e.message);
            }
        },
        startEdit(user) {
            this.editId = user.id;
            this.editUser = { username: user.username, email: user.email, password: '', is_admin: user.is_admin };
        },
        async saveEdit(user) {
            try {
                await api.updateUser(user.id, this.editUser);
                this.editId = null;
                this.editUser = { username: '', email: '', password: '' };
                this.loadUsers();
            } catch (e) {
                alert(e.message);
            }
        },
        async deleteUser(user) {
            if (!confirm(`Delete user ${user.username}?`)) return;
            try {
                await api.deleteUser(user.id);
                this.loadUsers();
            } catch (e) {
                alert(e.message);
            }
        },
        async rescoreAll() {
            if (!confirm('Rescore all articles? This may take a while.')) return;
            this.running = true; this.progress = '';
            try {
                const res = await api.request('/maintenance/rescore/', { method: 'POST' });
                this.result = res;
            } catch (e) {
                alert('Failed: ' + e.message);
            } finally {
                this.running = false;
            }
        },
        async purgeArticles() {
            if (!confirm(`Purge all articles older than ${this.purgeDays} days? This cannot be undone.`)) return;
            this.running = true; this.progress = '';
            try {
                const res = await api.request(`/maintenance/purge/?days=${this.purgeDays}`, { method: 'POST' });
                this.purgeResult = res;
            } catch (e) {
                alert('Failed: ' + e.message);
            } finally {
                this.running = false;
            }
        }
    }
};

// Register AdminPage globally so DashboardComponent can use it
// Register AdminPage after app is created (done below)

// Main App
const app = createApp({
    template: `
        <LoginComponent v-if="!isLoggedIn" @login="handleLogin" />
        <DashboardComponent v-else @logout="handleLogout" />
    `,
    data() {
        return {
            isLoggedIn: !!localStorage.getItem('token')
        };
    },
    methods: {
        handleLogin() {
            this.isLoggedIn = true;
        },
        handleLogout() {
            this.isLoggedIn = false;
        }
    },
    components: {
        LoginComponent,
        DashboardComponent,
        ArticlesPage,
        FeedsPage,
        KeywordsPage,
        StarredPage,
        AboutPage,
        AdminPage
    }
});

// Register AdminPage globally so DashboardComponent can use it
app.component('AdminPage', AdminPage);

app.mount('#app');