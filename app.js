const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const { format, parseISO } = require('date-fns');
const { marked } = require('marked');
const hljs = require('highlight.js');

const app = express();

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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.set('view engine', 'ejs');
app.use(express.static('public'));

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

app.get('/', (req, res) => {
    res.render('index', { 
        hasExistingData: !!app.locals.conversations
    });
});

app.post('/upload', async (req, res) => {
    let conversations = req.body;
    if (!Array.isArray(conversations)) {
        return res.status(400).send('Invalid conversation format');
    }
    
    try {
        // Sort conversations by created_at date (newest first)
        conversations = conversations
            .sort((a, b) => {
                const dateA = new Date(a.created_at);
                const dateB = new Date(b.created_at);
                return dateB - dateA;
            })
            .map((conv, index) => ({
                ...conv,
                displayIndex: index
            }));
        
        // Store conversations in app.locals
        app.locals.conversations = conversations;
        
        // Redirect to the first conversation
        res.redirect(`/conversation/0`);
    } catch (error) {
        console.error('Error processing conversations:', error);
        res.status(500).send('Error processing conversations');
    }
});
app.get('/conversation/:index', (req, res) => {
    const conversations = app.locals.conversations;
    if (!conversations) {
        return res.redirect('/');
    }

    const index = parseInt(req.params.index);
    if (isNaN(index) || index < 0 || index >= conversations.length) {
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
