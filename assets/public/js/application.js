"use strict";

var selectedItems = [];

// Array prototype function to remove an element
Array.prototype.removeElement = function(element) {
    var i = this.indexOf(element);
    if (i != -1) {
        this.splice(i, 1);
    }
}

// Array prototype function to replace an element
Array.prototype.replaceElement = function(oldEl, newEl) {
    var i = this.indexOf(oldEl);
    if (i != -1) {
        this[i] = newEl;
    }
}

// Document prototype function to send a costum event to itself
Document.prototype.sendCostumEvent = function(text) {
    document.dispatchEvent(new CustomEvent(text));
}

// Document prototype to get a cookie content
Document.prototype.getCookie = function(name) {
    var re = new RegExp("(?:(?:^|.*;\\s*)" + name + "\\s*\\=\\s*([^;]*).*$)|^.*$");
    return document.cookie.replace(re, "$1");
}

// Changes a button to the loading animation
Element.prototype.changeToLoading = function() {
    let element = this;
    let originalText = element.innerHTML;

    element.style.opacity = 0;

    setTimeout(function() {
        element.innerHTML = '<i class="material-icons spin">autorenew</i>';
        element.style.opacity = 1;
    }, 200);

    return originalText;
}

// Changes an element to done animation
Element.prototype.changeToDone = function(error, html) {
  this.style.opacity = 0;

  let thirdStep = () => {
      this.innerHTML = html;
      this.style.opacity = 1;

      if (selectedItems.length == 0) {
          document.sendCostumEvent('changed-selected');
      }
  }

  let secondStep = () => {
      this.style.opacity = 0;
      setTimeout(thirdStep, 200);
  }

  let firstStep = () => {
      if (error) {
          this.innerHTML = '<i class="material-icons">close</i>';
      } else {
          this.innerHTML = '<i class="material-icons">done</i>';
      }

      this.style.opacity = 1;

      setTimeout(secondStep, 1000);
  }

  setTimeout(firstStep, 200);
  return false;
}

// Event for toggling the mode of view
var viewEvent = function(event) {
    let cookie = document.getCookie('view-list');
    let listing = document.getElementById('listing');

    if (cookie != 'true') {
        document.cookie = 'view-list=true';
    } else {
        document.cookie = 'view-list=false';
    }

    handleViewType(document.getCookie('view-list'));
    return false;
}

// Handles the view type change
var handleViewType = function(viewList) {
    let listing = document.getElementById('listing');
    let button = document.getElementById('view');

    if (viewList == "true") {
        listing.classList.add('list');
        button.innerHTML = '<i class="material-icons">view_module</i>';
        return false;
    }

    button.innerHTML = '<i class="material-icons">view_list</i>';
    listing.classList.remove('list');
    return false;
}

// Handles the open file button event
var openEvent = function(event) {
    if (selectedItems.length) {
        window.open(selectedItems[0] + '?raw=true');
        return false;
    }

    window.open(window.location + '?raw=true');
    return false;
}

// Handles the back button event
var backEvent = function(event) {
    var items = document.getElementsByClassName('item');
    Array.from(items).forEach(link => {
        link.classList.remove('selected');
    });
    selectedItems = [];

    var event = new CustomEvent('changed-selected');
    document.dispatchEvent(event);
    return false;
}

// Handles the delete button event
var deleteEvent = function(event) {
    if (selectedItems.length) {
        Array.from(selectedItems).forEach(link => {
            let html = document.getElementById("delete").changeToLoading();
            let request = new XMLHttpRequest();

            request.open('DELETE', link);
            request.send();
            request.onreadystatechange = function() {
                if (request.readyState == 4) {
                    if (request.status == 200) {
                        document.getElementById(link).remove();
                        console.log(selectedItems);
                        selectedItems.removeElement(link);
                    }

                    document.getElementById('delete').changeToDone((request.status != 200), html);
                }
            }
        });

        return false;
    }

    let request = new XMLHttpRequest();
    request.open('DELETE', window.location);
    request.send();
    request.onreadystatechange = function() {
        if (request.readyState == 4) {
            if (request.status == 200) {
                window.location.pathname = RemoveLastDirectoryPartOf(window.location.pathname);
            }

            document.getElementById('delete').changeToDone((request.status != 200), html);
        }
    }

    return false;
}

// Prevent Default event
var preventDefault = function(event) {
    event.preventDefault();
}

// Rename file event
var renameEvent = function(event) {
    if (selectedItems.length) {
        Array.from(selectedItems).forEach(link => {
            let item = document.getElementById(link);
            let span = item.getElementsByTagName('span')[0];
            let name = span.innerHTML;

            item.addEventListener('click', preventDefault);
            item.removeEventListener('click', itemClickEvent);
            span.setAttribute('contenteditable', 'true');
            span.focus();

            let keyDownEvent = (event) => {
                if (event.keyCode == 13) {
                    let newName = span.innerHTML;
                    let html = document.getElementById('rename').changeToLoading();
                    let request = new XMLHttpRequest();
                    request.open('PATCH', link);
                    request.setRequestHeader('Rename-To', newName);
                    request.send();
                    request.onreadystatechange = function() {
                        if (request.readyState == 4) {
                            if (request.status != 200) {
                                span.innerHTML = name;
                            } else {
                                let newLink = link.replace(name, newName);
                                item.id = newLink;
                                selectedItems.replaceElement(link, newLink);
                                span.innerHTML = newName;
                            }

                            document.getElementById('rename').changeToDone((request.status != 200), html);
                        }
                    }
                }

                if (event.KeyCode == 27) {
                    span.innerHTML = name;
                }

                if (event.keyCode == 13 || event.keyCode == 27) {
                    span.setAttribute('contenteditable', 'false');
                    span.removeEventListener('keydown', keyDownEvent);
                    item.removeEventListener('click', preventDefault);
                    item.addEventListener('click', itemClickEvent);
                    event.preventDefault();
                }

                return false;
            }

            span.addEventListener('keydown', keyDownEvent);
            span.addEventListener('blur', (event) => {
                span.innerHTML = name;
                span.setAttribute('contenteditable', 'false');
                span.removeEventListener('keydown', keyDownEvent);
                item.removeEventListener('click', preventDefault);
            });
        });

        return false;
    }

    return false;
}

// Download file event
var downloadEvent = function(event) {
    if (selectedItems.length) {
        Array.from(selectedItems).forEach(item => {
            window.open(item + "?download=true");
        });
        return false;
    }

    window.open(window.location + "?download=true");
    return false;
}

var RemoveLastDirectoryPartOf = function(url) {
    var arr = url.split('/');
    arr.pop();
    return (arr.join('/'));
}

document.addEventListener("changed-selected", function(event) {
    var toolbar = document.getElementById("toolbar");
    var selectedNumber = selectedItems.length;

    document.getElementById("selected-number").innerHTML = selectedNumber;

    if (selectedNumber) {
        toolbar.classList.add("enabled");

        if (selectedNumber > 1) {
            document.getElementById("open").classList.add("disabled");
            document.getElementById("rename").classList.add("disabled");
        }

        if (selectedNumber == 1) {
            document.getElementById("open").classList.remove("disabled");
            document.getElementById("rename").classList.remove("disabled");
        }

        return false;
    }

    toolbar.classList.remove("enabled");
    return false;
});

var itemClickEvent = function(event) {
    var url = this.getElementsByTagName('a')[0].getAttribute('href');

    if (selectedItems.length != 0) event.preventDefault();
    if (selectedItems.indexOf(url) == -1) {
        this.classList.add('selected');
        selectedItems.push(url);
    } else {
        this.classList.remove('selected');
        selectedItems.removeElement(url);
    }

    var event = new CustomEvent('changed-selected');
    document.dispatchEvent(event);
    return false;
}

document.addEventListener("DOMContentLoaded", function(event) {
    var items = document.getElementsByClassName('item');
    Array.from(items).forEach(link => {
        link.addEventListener('click', itemClickEvent);
    });

    document.getElementById("open").addEventListener("click", openEvent);
    if (document.getElementById("back")) {
        document.getElementById("back").addEventListener("click", backEvent)
    };
    if (document.getElementById("view")) {
        handleViewType(document.getCookie("view-list"));
        document.getElementById("view").addEventListener("click", viewEvent)
    };
    document.getElementById("delete").addEventListener("click", deleteEvent);
    document.getElementById("rename").addEventListener("click", renameEvent);
    document.getElementById("download").addEventListener("click", downloadEvent);

    /* var drop = document.getElementById("listing");
    drop.addEventListener("dragenter", change, false);
    drop.addEventListener("dragleave",change_back,false);

    function change() {
      drop.style.backgroundColor = '#EFF2AA';
    };

    function change_back() {
      drop.style.backgroundColor = 'transparent';
    }; */


    return false;
});
