var ISTAT_BG_VERSION=0.1;

var bg = {
  version: ISTAT_BG_VERSION,
  hosts: undefined,
  error: undefined,
  refreshStatus: {state: false, error: undefined},
  ajaxData: $("<div />"),
  intervalId: undefined,

  respond: function(resp, sendResponse) {
    if ( bg.sendResponse != undefined )
    bg.sendResponse({state: resp.state, error: resp.error})

    bg.refreshStatus.state = resp.state;
    bg.refreshStatus.error = resp.error;
  },

  refreshData: function(refreshStatus, sendResponse) {
    console.log('refreshing data');
    bg.error = undefined;
    bg.refreshStatus.state = false;

    // basic info from user setup
    var username = window.localStorage.username;
    var password = window.localStorage.password;
    var url = window.localStorage.url;
    var url_base = window.localStorage.url_base;

    try {
      var modifiers = window.localStorage.ignoreCaseSensitivity === "false" ? "" : "i";
      var ignoreServicesRegexp = false;
      if ( typeof(window.localStorage.ignoreServicesRegexp) != 'undefined' && window.localStorage.ignoreServicesRegexp != "" ) {
        ignoreServicesRegexp = new RegExp (window.localStorage.ignoreServicesRegexp, modifiers);
      }
      var ignoreHostsRegexp = false;
      if ( typeof(window.localStorage.ignoreHostsRegexp) != 'undefined' && window.localStorage.ignoreHostsRegexp != "" ) {
        ignoreHostsRegexp = new RegExp (window.localStorage.ignoreHostsRegexp, modifiers);
      }
    } catch (e) {
      bg.error = 'bad-regexp';
      bg.respond({state: false, error: bg.error}, sendResponse);
      errorBadge();
      return false;
    }

    // setup needs url
    if ( url == '' || url == undefined ) {
      debug_log('Url not defined');
      bg.error = 'need-setup';

      // we need to handle response
      bg.respond({state: false, error: bg.error}, sendResponse);

      return false;
    }

    bg.hosts = new Hosts();

    // url is ok, add host=all for now
    url = url+'?host=all&limit=0';

    // try to get data from icinga
    $.ajax({global: false, url: url,
            beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", "Basic " + window.btoa(username + ":" + password));
      },
            complete: function(res, status) {
        //bg.respond({state: false, error: 'au'}, sendResponse);
        ////console.log(status);
        ////console.log(res);

        if ( res.status != 200 ) {
          switch(res.status)
          {
            case 404:
            bg.error = 'bad-url';
            break;
            case 401:
            bg.error = 'bad-auth';
            break;
            default:
            bg.error = 'unknown';
          }
          bg.respond({state: false, error: bg.error}, sendResponse);
          return;
        }

        debug_log(res.getAllResponseHeaders());
        if ( status === "success" || status === "notmodified" ) {
          var selector = " .status > tbody > tr:gt(0)";

          // regular pro smazani obrazku
          //var rimg = /<img(.|\s)*?\/?>/gi;
          var rimg = /<img.*?src='([^']+)'.*?\/?>/gi;

          // cleanup because of mem-leaks
          bg.ajaxData.empty();

          // FIXME: find better way how to receive data without loading images
          //bg.ajaxData.append(res.responseText.replace(rimg, "<span imgurl='$1' >").replace(/<script.*?>.*?<\/script>/gmi, '').replace(/<script/gmi, '<oldscript')).find(selector);
          bg.ajaxData.html($('<div />').append(res.responseText.replace(rimg, "<span imgurl='$1' >").replace(/<script.*?>.*?<\/script>/gmi, '').replace(/<script/gmi, '<oldscript')).find(selector));
          //obj.html($('<div id="icingaReqStorage" />').append(res.responseText.replace(rimg, "<span imgurl='$1' >").replace(/<script.*?>.*?<\/script>/gmi, '').replace(/<script/gmi, '<oldscript')).find(selector));

          var host = '';

          var service = '';
          var link = '';
          var ackService = false;
          var ackHost = false;
          var downtimeService = false;
          var downtimeHost = false;

          // browse rows
          console.log('traversing data');
          bg.ajaxData.find("> tr").each( function(index, el) {
            ack = false;
            downtime = false;
            // browse cols
            $(el).find("> td").each( function(i, e) {
              // first col, we solve host
              if(i == 0)  {
                val = $(e).find("a").text();
                if ( val != '' ) {
                  // get Host state
                  var statusclass = $(this).attr('class');
                  host = val;
                  var href = $(e).find("a").attr('href');
                  acked = $(e).find("span[imgurl*='ack.gif']").attr('imgurl');
                  ackHost = ( acked == undefined ) ? false : true;
                  downtimeed = $(e).find("span[imgurl*='downtime.gif']").attr('imgurl');
                  downtimeHost = ( downtimeed == undefined ) ? false : true;

                  // do not add hosts that we've ignored with regexp
                  if (typeof(ignoreHostsRegexp) != 'object' || host.search(ignoreHostsRegexp) == -1) {
                    h = new Host(host, href);
                    // TODO: pridat kontrolu acku u hosta
                    bg.hosts.addHost(h, statusclass, ackHost, downtimeHost);
                  }
                }
              }
              // second col is service
              else if ( i == 1 ) {
                service = $(e).find("a").text();
                link = $(e).find("a").attr('href');
                acked = $(e).find("span[imgurl*='ack.gif']").attr('imgurl');
                ackService = ( acked == undefined ) ? false : true;
                downtimeed = $(e).find("span[imgurl*='downtime.gif']").attr('imgurl');
                downtimeService = ( downtimeed == undefined ) ? false : true;
              }
              // service status
              else if ( i == 2 ) {
                var state = $(e).text();

                // do not add services that we've ignored with regexp
                // also do not add those from ignored hosts
                if ((typeof(ignoreServicesRegexp) != 'object' || service.search(ignoreServicesRegexp) == -1)
                    && (typeof(ignoreHostsRegexp) != 'object' ||  host.search(ignoreHostsRegexp) == -1)) {
                  s = new Service(service, link, state, ackService, downtimeService);
                  bg.hosts.getHost(host).addService(s);
                  //debug_log("Found service: "+service+" with url "+href+" and state "+state);
                }
              }
              // other columns
              // 3 - last check
              // 4 - duration
              // 5 - attempt
              // 6 - status
            });
          });

          // cleanup memory
          bg.ajaxData.empty();

          bg.hosts.setBadge();

          bg.respond({state: true, error: undefined}, sendResponse);
        } else {
          bg.respond({state: false, error: 'unhandled state'}, sendResponse);
        }

      }});
  },

  setRefreshInterval: function() {
    // clear old interval
    if ( bg.intervalId != undefined ) { clearInterval(bg.intervalId); }

    // set refresh interval from options
    var refreshInterval = window.localStorage.refresh;

    if ( refreshInterval == undefined ) {
      refreshInterval = 30000;
    } else {
      refreshInterval *= 1000;
    }

    // set refresh only if greater than 0
    if ( refreshInterval > 0 ) {
      console.log("Refresh interval set to "+refreshInterval+" miliseconds");
      intervalId = setInterval(function() { bg.refreshData(bg.refreshStatus); }, refreshInterval);
    }
  },

  // REQUEST LISTENER
  listener: function() {
    chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
      // function for reporting what background script supports
      if(request.reqtype == 'supports') {
        var state = 'no';

        if ( request.what == 'dummy' )
        state = 'ok';

        sendResponse({state: state});

        // get stored data
      } else if ( request.reqtype == "get-data" ) {

        // we need setup first
        if ( bg.error != undefined ) {
          if ( sendResponse != undefined )
          sendResponse({state: false, error: bg.error});
          return;
        }
        else if ( bg.hosts == undefined) {
          debug_log('Oooops, we have no data.');
          sendResponse({state: false});
          return;
        }

        resp = bg.hosts.toJSON();
        resp.state = bg.refreshStatus.state;
        resp.error = bg.refreshStatus.error;
        sendResponse(resp);

        if ( bg.refreshStatus.error )
        clearBadge();

        // refresh data
      } else if ( request.reqtype == "refresh-data" ) {
        bg.refreshData(bg.refreshStatus,sendResponse);
        bg.setRefreshInterval();

        // reload background page
      } else if(request.reqtype == 'reload-background') {
        window.location.reload();

        // unknown request
      } else
      sendResponse({state: false, error: 'Unknown request'});

    });
  }
};

// TODO: locking aby se nemlatilo s rucnim reloadem
bg.refreshData(bg.refreshStatus);
bg.setRefreshInterval();
bg.listener();
