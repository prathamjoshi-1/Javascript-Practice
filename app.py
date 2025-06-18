from flask import Flask, request, jsonify
from flask_cors import CORS
import openai

app = Flask(__name__)
CORS(app)

openai.api_key = "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"  # Replace with your actual OpenAI API key

@app.route('/generate', methods=['GET'])
def generate_website():
    prompt = request.args.get('prompt', '')

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a professional web developer. Generate a full HTML website with CSS based on the user's prompt."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.7
        )

        html_content = response.choices[0].message['content']
        return html_content

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
    
    
    
    
    # This Below Output is My Backend Server IP Addresss