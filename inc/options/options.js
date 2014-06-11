// Saves options to localStorage.
// TODO: don't allow to save twice at same time because of setting interval in background
function save_options() {
  if (!window.localStorage) {
    alert("Error local storage is unavailable.");
    window.close();
  }

  window.localStorage.username = document.getElementById("username").value;
  if ( document.getElementById("password").value != '' )
  window.localStorage.password = document.getElementById("password").value;

  window.localStorage.url = document.getElementById("url").value;

  window.localStorage.url_base = window.localStorage.url.replace(/^(https?:\/\/[^\/]+)\/.*$/i, '$1');
  window.localStorage.url_icinga = window.localStorage.url.replace(/^(.*)\/[^\/]+.cgi$/i, '$1');

  window.localStorage.refresh = document.getElementById("refresh").value;

  window.localStorage.dateFormat = document.getElementById("dateFormat").value;
  window.localStorage.ignoreServicesRegexp = document.getElementById("ignoreServicesRegexp").value;
  window.localStorage.ignoreHostsRegexp = document.getElementById("ignoreHostsRegexp").value;

  window.localStorage.ignoreCaseSensitivity =
  document.getElementById("ignoreCaseSensitivity").checked ? true : false;

  window.localStorage.hideAcked =
  document.getElementById("hideAcked").checked ? true : false;

  window.localStorage.hideDowntimeed =
  document.getElementById("hideDowntimeed").checked ? true : false;

  // Update status to let user know options were saved.
  var status = document.getElementById("status");
  status.innerHTML = "Options Saved.";
  setTimeout(function() {
    status.innerHTML = "";
  }, 750);

  // refresh data
  chrome.extension.sendRequest({reqtype: "refresh-data"});
}

// Restores select box state to saved value from localStorage.
function restore_options() {
  if ( window.localStorage.username != undefined )
  document.getElementById("username").value = window.localStorage.username;

  if ( window.localStorage.url != undefined ) {
    document.getElementById("url").value = window.localStorage.url;
  }

  if ( window.localStorage.refresh != undefined ) {
    document.getElementById("refresh").value = window.localStorage.refresh;
  } else {
    document.getElementById("refresh").value = 30;
  }

  if ( window.localStorage.ignoreServicesRegexp != undefined ) {
    document.getElementById("ignoreServicesRegexp").value = window.localStorage.ignoreServicesRegexp;
  }

  if ( window.localStorage.dateFormat != undefined && window.localStorage.dateFormat != '' ) {
    document.getElementById("dateFormat").value = window.localStorage.dateFormat;
  } else {
    document.getElementById("dateFormat").value = "DD-MM-YYYY hh:mm:ss";
  }

  if ( window.localStorage.ignoreHostsRegexp != undefined ) {
    document.getElementById("ignoreHostsRegexp").value = window.localStorage.ignoreHostsRegexp;
  }

  document.getElementById("ignoreCaseSensitivity").checked = (window.localStorage.ignoreCaseSensitivity === "false") ? false : true;

  document.getElementById("hideAcked").checked = (window.localStorage.hideAcked === "true") ? true : false;
  document.getElementById("hideDowntimeed").checked = (window.localStorage.hideDowntimeed === "true") ? true : false;
}

function update_refresh()
{
  $('#refrsecs').html( $("#refresh").val() + " seconds");
}

$(document).ready(function() {
  // show tabs
  $("#tabs").tabs();
  restore_options();
  update_refresh();

  $("#save_button").click(save_options);
  $("#refresh").on( "change", update_refresh );

  $("img.lazy").lazyload();
});

console.log(window.localStorage);
