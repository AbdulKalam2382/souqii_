import fetch from 'node-fetch';

const url = "https://souqii-one.vercel.app/api/telegram";
const payload = {
  message: {
    chat: { id: 987654321 }, // mock chat ID
    from: { first_name: "TestUser" },
    text: "browse"
  }
};

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
