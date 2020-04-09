function loadHandler() {
    chrome.storage.sync.get('cc', function(data) {
        simplemde.value(data.cc);
    });
    var simplemde = new SimpleMDE({ element: document.getElementById("content"),
        placeholder : 'think before you write...',
        renderingConfig: {
            singleLineBreaks: false,
            codeSyntaxHighlighting: true,
        },
        styleSelectedText: false,
        hideIcons: ["guide", "heading"],
        showIcons: ["code", "table"],
        autoDownloadFontAwesome: false
    });
    simplemde.codemirror.on("change", function(){
        chrome.storage.sync.set({cc: simplemde.value()}, function() {
        });
    });
}

window.addEventListener('load', loadHandler);
