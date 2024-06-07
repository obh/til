import jwt
import time

METABASE_SITE_URL = "http://localhost:3000"
METABASE_SECRET_KEY = "0c9b18729feb32d891f784dbf7f34a7c3e70b37d34860b63365bc17bf8ee1780"

payload = {
  "resource": {"question": 3},
  "params": {
    
  },
  "exp": round(time.time()) + (60 * 10) # 10 minute expiration
}
token = jwt.encode(payload, METABASE_SECRET_KEY, algorithm="HS256")

iframeUrl = METABASE_SITE_URL + "/embed/question/" + token +  "#bordered=true&titled=true"
print(iframeUrl)
