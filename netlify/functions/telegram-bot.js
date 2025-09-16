// netlify/functions/signaling.js
const sessions = new Map();

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    try {
        const { action, sessionId, type, data } = JSON.parse(event.body);
        
        switch (action) {
            case 'check-calls':
                return handleCheckCalls(sessions, sessionId, headers);
                
            case 'check-response':
                return handleCheckResponse(sessions, sessionId, headers);
                
            case 'signal':
                return handleSignal(sessions, sessionId, type, data, headers);
                
            case 'accept-call':
            case 'reject-call':
                return handleCallResponse(sessions, sessionId, action, data, headers);
                
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Unknown action' })
                };
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

function handleCheckCalls(sessions, sessionId, headers) {
    const hasCall = sessions.has(`call-${sessionId}`);
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ hasCall })
    };
}

function handleCheckResponse(sessions, sessionId, headers) {
    const accepted = sessions.has(`accepted-${sessionId}`);
    const rejected = sessions.has(`rejected-${sessionId}`);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ accepted, rejected })
    };
}

function handleSignal(sessions, sessionId, type, data, headers) {
    sessions.set(`signal-${sessionId}-${type}`, data);
    
    // 5 dakika sonra temizle
    setTimeout(() => {
        sessions.delete(`signal-${sessionId}-${type}`);
    }, 300000);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
    };
}

function handleCallResponse(sessions, sessionId, action, data, headers) {
    if (action === 'accept-call') {
        sessions.set(`accepted-${sessionId}`, true);
    } else {
        sessions.set(`rejected-${sessionId}`, true);
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
    };
}
