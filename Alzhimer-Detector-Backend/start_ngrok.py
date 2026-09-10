import time
from pyngrok import ngrok

try:
    # Authenticate with the user's provided token
    ngrok.set_auth_token("3J7alK6DvvGP1beAZndETkU5Cu6_Z9XVS65Tcq5MDoXVmphr")
    
    # Start a tunnel on port 8000
    public_url = ngrok.connect(8000).public_url
    
    print("\n" + "="*60)
    print("SUCCESS! Your stable Ngrok tunnel is running!")
    print(f"Put this EXACT URL into Dialogflow Fulfillment:")
    print(f"{public_url}/api/webhook")
    print("="*60 + "\n")
    
    # Keep the script running
    while True:
        time.sleep(1)
        
except Exception as e:
    print(f"Error starting ngrok: {e}")
