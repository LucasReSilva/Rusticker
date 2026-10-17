const endpoint = process.argv[2] ?? 'http://127.0.0.1:9237';
const pageUrl = process.argv[3] ?? 'http://127.0.0.1:4179/';
const targets = await (await fetch(`${endpoint}/json`)).json();
const page = targets.find((target) => target.type === 'page' && target.url === pageUrl);
if (!page) throw new Error('Evaluation page is not open in the browser');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

let nextId = 1;
const pending = new Map();
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
};

async function evaluate(expression) {
  const id = nextId++;
  const response = new Promise((resolve) => pending.set(id, resolve));
  socket.send(JSON.stringify({
    id,
    method: 'Runtime.evaluate',
    params: { expression, returnByValue: true },
  }));
  return response;
}

for (let attempt = 0; attempt < 180; attempt += 1) {
  const response = await evaluate("document.querySelector('#result')?.textContent");
  const result = response.result?.result?.value;
  if (result && result !== 'pending') {
    console.log(result);
    socket.close();
    process.exitCode = result.includes('"status":"passed"') ? 0 : 1;
    process.exit();
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

socket.close();
throw new Error('Timed out waiting for the evaluation worker');
