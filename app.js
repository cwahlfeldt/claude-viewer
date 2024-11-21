const express = require('express');
const path = require('path');
const { format, parseISO } = require('date-fns');
const { marked } = require('marked');
const hljs = require('highlight.js');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Initialize express
const app = express();

// Basic error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

// Configure marked with highlight.js
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
        },
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Set view engine and static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions
const helpers = {
    formatDate: (dateString) => format(parseISO(dateString), 'PPP'),
    formatTime: (dateString) => format(parseISO(dateString), 'p'),
    formatMessage: (text) => {
        try {
            return marked.parse(text);
        } catch (error) {
            console.error('Error formatting message:', error);
            return text;
        }
    },
    truncate: (str, length = 30) => {
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    }
};

// Routes
app.get('/', (req, res) => {
    console.log('Serving index page');
    res.render('index', { 
        hasExistingData: !!app.locals.conversations
    });
});

app.post('/upload', async (req, res) => {
    console.log('Received upload request');
    let conversations = req.body;
    
    if (!Array.isArray(conversations)) {
        console.error('Invalid format: not an array');
        return res.status(400).send('Invalid conversation format');
    }
    
    try {
        conversations = conversations
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map((conv, index) => ({
                ...conv,
                displayIndex: index
            }));
        
        app.locals.conversations = conversations;
        console.log(`Processed ${conversations.length} conversations`);
        
        res.redirect(`/conversation/0`);
    } catch (error) {
        console.error('Error processing conversations:', error);
        res.status(500).send('Error processing conversations');
    }
});

app.get('/conversation/:index', (req, res) => {
    console.log('Serving conversation page');
    const conversations = app.locals.conversations;
    
    if (!conversations) {
        console.log('No conversations found, redirecting to index');
        return res.redirect('/');
    }

    const index = parseInt(req.params.index);
    if (isNaN(index) || index < 0 || index >= conversations.length) {
        console.log('Invalid index, redirecting to first conversation');
        return res.redirect('/conversation/0');
    }

    res.render('conversation', {
        conversation: conversations[index],
        conversations: conversations,
        currentIndex: index,
        totalConversations: conversations.length,
        formatDate: helpers.formatDate,
        formatTime: helpers.formatTime,
        formatMessage: helpers.formatMessage,
        truncate: helpers.truncate
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Application error:', err);
    res.status(500).send('An error occurred');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
});