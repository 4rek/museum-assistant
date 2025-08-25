# Rate Limiting Test Guide

## Overview
The rate limiting system has been successfully implemented with Upstash Redis. Here's how to test it:

## Setup Requirements

1. **Get Upstash Redis credentials:**
   - Go to [upstash.com](https://upstash.com)
   - Create a free Redis database
   - Copy the REST URL and Token

2. **Update .env file:**
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
   ```

## Rate Limit Configuration

- **Limit**: 10 interactions per 5 minutes
- **Window**: Sliding window (more precise than fixed window)
- **Scope**: Per authenticated user
- **Applies to**: Both chat messages and artwork analysis

## How It Works

1. **User Authentication**: Each request must include a valid auth token
2. **User Identification**: Rate limits are applied per user ID
3. **Redis Storage**: Uses sorted sets for efficient sliding window tracking
4. **Automatic Cleanup**: Old entries are removed automatically

## Testing Steps

### 1. With Real User Session:
```bash
# 1. Sign in a user in the React Native app
# 2. Use that session token in requests
# 3. Make 10+ rapid requests to trigger rate limit

# Example request:
curl -X POST "http://127.0.0.1:54321/functions/v1/chat" \
  -H "Authorization: Bearer YOUR_REAL_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test message", "createNew": true}'
```

### 2. Expected Behavior:
- **Requests 1-10**: Normal responses with rate limit headers
- **Request 11+**: HTTP 429 with rate limit exceeded message
- **After 5 minutes**: Rate limit resets, requests work again

### 3. Rate Limit Headers:
```
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1734567890
Retry-After: 300
```

## React Native Integration

The app handles rate limits gracefully:

- **Analysis Screen**: Shows alert with wait time
- **Chat Screen**: Displays inline message about rate limit
- **PhotoPicker**: Prevents further analysis until reset

## Error Messages

### English (PhotoPicker):
```
"Rate Limit Exceeded
You've reached the limit of 10 interactions in 5 minutes. 
Please wait X minutes before trying again."
```

### Polish (Chat Screen):
```
"Osiągnięto limit zapytań. 
Spróbuj ponownie za X minut. 
Limit to 10 interakcji w ciągu 5 minut."
```

## Monitoring

Rate limiting data is stored in Redis with keys like:
```
rate_limit:user-uuid-here
```

Each key contains a sorted set with timestamps, automatically cleaned up.

## Failsafe Behavior

If Upstash is down or misconfigured:
- Rate limiting fails open (allows requests)
- Logs error for debugging
- Prevents service disruption

## Production Considerations

1. **Different Limits**: Consider separate limits for analysis vs chat
2. **IP-based Backup**: Add IP rate limiting for unauthenticated requests  
3. **Monitoring**: Track rate limit hits in analytics
4. **Adjustable Limits**: Make limits configurable per user tier