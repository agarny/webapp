const searchParams = new URLSearchParams(window.location.search);

document.getElementById('copyright').innerText = searchParams.get('copyright') ?? '';
document.getElementById('version').innerText = searchParams.get('version') ?? '';
