let changeColor = document.getElementById('changeColor');

chrome.storage.local.get('color', function(data) {
    changeColor.style.backgroundColor = data.color;
    changeColor.setAttribute('value', data.color);
});
