// In-memory storage for calls (production'da database kullanılabilir)
let activeCall = null;
let callResponses = new Map();

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
        const { action, sessionId, callType, isMobile, responseType, targetSessionId } = JSON.parse(event.body);
        
        switch (action) {
            case 'new-call':
                return handleNewCall(sessionId, callType, isMobile, headers);
                
            case 'check-calls':
                return handleCheckCalls(headers);
                
            case 'check-response':
                return handleCheckResponse(sessionId, headers);
                
            case 'call-response':
                return handleCallResponse(responseType, targetSessionId, headers);
                
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Unknown action' })
                };
        }
    } catch (error) {
        console.error('Signaling error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

function handleNewCall(sessionId, callType, isMobile, headers) {
    // Yeni arama kaydı
    activeCall = {
        sessionId,
        callType,
        isMobile: !!isMobile,
        timestamp: Date.now()
    };
    
    // 5 dakika sonra otomatik temizle
    setTimeout(() => {
        if (activeCall && activeCall.sessionId === sessionId) {
            activeCall = null;
        }
    }, 300000);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
            success: true, 
            message: 'Call registered',
            sessionId 
        })
    };
}

function handleCheckCalls(headers) {
    const hasCall = activeCall !== null;
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
            hasCall,
            callData: activeCall
        })
    };
}

function handleCheckResponse(sessionId, headers) {
    const response = callResponses.get(sessionId);
    
    if (response) {
        // Yanıt alındı, temizle
        callResponses.delete(sessionId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                accepted: response.type === 'accept',
                rejected: response.type === 'reject'
            })
        };
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            accepted: false,
            rejected: false
        })
    };
}

function handleCallResponse(responseType, targetSessionId, headers) {
    // Response kaydet
    callResponses.set(targetSessionId, {
        type: responseType,
        timestamp: Date.now()
    });
    
    // Aktif aramayı temizle
    if (activeCall && activeCall.sessionId === targetSessionId) {
        activeCall = null;
    }
    
    // 2 dakika sonra response'u temizle
    setTimeout(() => {
        callResponses.delete(targetSessionId);
    }, 120000);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
            success: true,
            message: `Call ${responseType}ed`
        })
    };
}
