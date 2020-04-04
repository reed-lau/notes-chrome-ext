function loadHandler() {
    chrome.storage.sync.get('cc', function(data) {
        document.getElementById('content').value = data.cc;
    });
    var editor = editormd("editor", {
        width: "100%",
        height: 720,
        placeholder : "think before you write...",
        taskList : true,
        tex : true,
        emoji : true,
        onchange : function () {
            content = document.getElementById('content').value
            chrome.storage.sync.set({cc: content}, function() {
            });
        },
        // markdown: "xxxx",     // dynamic set Markdown text
        path : "editor.md/lib/"  // Autoload modules mode, codemirror, marked... dependents libs path
    });
}

window.addEventListener('load', loadHandler);
