function goto(url) {
  console.log('opening url ' + url);
  chrome.tabs.create({url: url});

  if ( typeof arguments[1] != "undefined" && arguments[1] === true )
  window.close();
}

function refresh()
{
  chrome.extension.sendRequest({reqtype: "refresh-data"}, function(response) {
    show();
  });
}

function z(num)
{
  if ( num < 10 ) {
    num = '0'+num;
  }
  return num;
}

Date.prototype.format = function(format) //author: meizz
{
  var o = {
    "M+" : this.getMonth()+1, //month
    "D+" : this.getDate(),    //day
    "h+" : this.getHours(),   //hour
    "m+" : this.getMinutes(), //minute
    "s+" : this.getSeconds() //second
  }

  if(/(Y+)/.test(format)) format=format.replace(RegExp.$1,
                                                (this.getFullYear()+"").substr(4 - RegExp.$1.length));
  for(var k in o)if(new RegExp("("+ k +")").test(format))
  format = format.replace(RegExp.$1,
                          RegExp.$1.length==1 ? o[k] :
                                            ("00"+ o[k]).substr((""+ o[k]).length));
  return format;
}

function sendCommand(command, hostname, servicename)
{
  // basic variables
  hostname = hostname.toLowerCase();
  cmds = {'ack': 33, 'reschedule': 96};
  cmd_url = window.localStorage.url_icinga + '/cmd.cgi';
  service_query = '';

  // run command for service not for host
  if ( servicename != undefined ) {
    cmds = {'ack': 34, 'reschedule': 7};
    servicename = servicename.replace(/ /, "+");
    service_query = '&service='+servicename;
  }

  // Acknowledge host or service problem
  if ( command == 'ack' ) {
    goto(cmd_url+'?cmd_typ='+cmds[command]+'&host='+hostname+service_query);

    // Reschedule next check of host or service
  } else if ( command == 'reschedule' ) {
    var format = ( window.localStorage.dateFormat != undefined ) ? window.localStorage.dateFormat : "DD-MM-YYYY hh:mm:ss";
    var time = encodeURIComponent( new Date().format(format) );
    console.log(format);
    console.log( decodeURIComponent(time) );

    var dataString = 'cmd_typ=' + cmds[command] + '&cmd_mod=2&host=' + hostname + service_query + '&start_time=' + time + '&force_check=on&submit=Commit';
    $.post(cmd_url, dataString, function(data, textStatus) { debug_log(textStatus); debug_log(data); });
  }
}

function show()
{
  chrome.extension.sendRequest({reqtype: "get-data"}, function(response) {
    if ( response.state == false ) {
      debug_log("We received false response from background");
      debug_log(response.error);

      if ( response.error == 'need-setup' )
      msg = 'You need to <a class="icinga-link" href="#" data-href="options.html">setup this extension</a> first.';
      else if ( response.error == 'bad-auth' )
      msg = 'Your username or password is probably wrong. <a class="icinga-link" href="#" data-href="options.html">Fix it in options.</a>.';
      else if ( response.error == 'bad-url' )
      msg = 'URL to status.cgi doesn\'t exists on server, please <a class="icinga-link" href="#" data-href="options.html">setup correct URL</a> first.';
      else if ( response.error == 'bad-regexp' )
      msg = 'It appears that you have a syntax error in your regular expression, please <a class="icinga-link" href="#" data-href="options.html">go to options</a> to correct it.';
      else if ( response.error = 'unknown' )
      msg = 'Unknown error. Please provide more details about your config to github issue page so I can help you.';
      else
      msg = 'Please wait, data not ready yet.';

      $("#output").html(msg);
      $("#outputHosts").html(msg);
      $("#outputServices").html(msg);
      $("a.icinga-link").click(function () { goto( $(this).data('href') ); })
      return;
    }

    debug_log(response.state);

    var oo = '';
    var oh = '';
    var os = '';

    var hideAcked = window.localStorage.hideAcked === "true" ? true : false;

    // browse all hosts
    for (var h in response.hosts) {
      var host = response.hosts[h];
      var reschedule='<a title="Reschedule check of this host" class="command ui-icon ui-icon-refresh" href="#" data-command="reschedule" data-host="' + host.name + '">resch</a>';
      var ack='<a title="Acknowledge this problem" class="command ui-icon ui-icon-wrench" href="#" data-command="ack" data-host="' + host.name + '">ack</a>';
      var hDowntime = host.downtime ? ' downtime' : '';

      var line = '<tr class="host" data-hostname="'+host.name+'"><td colspan="2" class="normal'+hDowntime+'"><a class="icinga-link" href="#" data-href="'+window.localStorage.url_icinga+'/'+host.link+'">'+host.name+'</a>'+(host.ack?'&nbsp;<span class="ui-icon ui-icon-check" style="float: right;" title="Acknowledged">&nbsp;</span>':'')+'</td><td class="state '+stateClass(host.state)+'">'+stateClass(host.state, true)+'</td><td class="tools">'+reschedule+(host.ack || host.downtime || host.state == 0 ? '' : ack)+'</td></tr>';

      // add to overview only if not ok
      var _states = hideAcked ? host.states : host.states_all;

      if ( _states['HOST'] > 0 || _states['WRONG'] > 0 )
      oo += line;

      oh += line;
      os += line;

      // browse all services of host
      for (var s in host.services ) {
        var service = host.services[s];
        var sDowntime = service.downtime ? ' downtime' : '';
        var reschedule='<a title="Reschedule check of this service" class="command ui-icon ui-icon-refresh" href="#" data-command="reschedule" data-host="' + host.name + '" data-service="' + service.name + '">resch</a>';
        var ack='<a title="Acknowledge this problem" class="command ui-icon ui-icon-wrench" href="#" data-command="ack" data-host="' + host.name + '" data-service="' + service.name + '">ack</a>';

        var line = '<tr class="service" data-hostname="'+host.name+'" data-servicename="'+service.name+'"><td style="width: 30px;">&nbsp;</td><td class="normal'+sDowntime+'" style="white-space: nowrap;"><a class="icinga-link" href="#" data-href="'+window.localStorage.url_icinga+'/'+service.link+'">'+service.name+'</a>'+(service.ack?'&nbsp;<span class="ui-icon ui-icon-check" style="float: right;" title="Acknowledged">&nbsp;</span>':'')+'</td><td class="state '+stateClass(service.state)+'">'+stateClass(service.state, true)+'</td><td class="tools">'+reschedule+(service.ack || service.downtime || service.state == 0 ? '' : ack)+'</td></tr>';


        // add to overview only if not ok
        if ( service.state > 0 && ( !hideAcked || ( hideAcked && !service.ack ) ) )
        oo += line;

        os += line;
      }
    }

    if ( oo == '' ) {
      oo = '<p id="all-ok">Everything is OK. Just take your coffee and relax.</p>';
    } else {
      oo = '<br /><h3>Problems on hosts and services</h3><table id="tableOverview">'+oo+'</table>';
    }

    var ot = '<div id="totalsHosts"><h3>Host Status</h3><table>'+
             '<tr><th>Up</th><th>Down</th><th>Unr</th><th>Pend</th></tr>'+
             '<tr>'+
             '<td class="ok">'+response.totals_hosts[0]+'/'+response.totals_all_hosts[0]+'</td>'+
             '<td class="cri">'+response.totals_hosts[8]+'/'+response.totals_all_hosts[8]+'</td>'+
             '<td class="unr">'+response.totals_hosts[4]+'/'+response.totals_all_hosts[4]+'</td>'+
             '<td class="pend">'+response.totals_hosts[1]+'/'+response.totals_all_hosts[1]+'</td>'+
             '</tr></table></div>';

    ot = ot + '<div id="totalsServices"><h3>Service Status</h3><table>'+
         '<tr><th>Ok</th><th>Warn</th><th>Unkn</th><th>Crit</th><th>Pend</th></tr>'+
         '<tr>'+
         '<td class="ok">'+response.totals_services[0]+'/'+response.totals_all_services[0]+'</td>'+
         '<td class="warn">'+response.totals_services[4]+'/'+response.totals_all_services[4]+'</td>'+
         '<td class="unkn">'+response.totals_services[2]+'/'+response.totals_all_services[2]+'</td>'+
         '<td class="cri">'+response.totals_services[8]+'/'+response.totals_all_services[8]+'</td>'+
         '<td class="pend">'+response.totals_services[1]+'/'+response.totals_all_services[1]+'</td>'+
         '</tr></table></div><br class="clear" />';


    $("#output").html(ot+oo)
    $("#outputHosts").html('<input type="text" id="searchHosts" placeholder="enter part i.e. part of hostname" /><table id="tableHosts">'+oh+'</table>');
    $("#outputServices").html('<input type="text" id="searchServices" placeholder="enter part i.e. part of service name or hostname" /><table id="tableServices">'+os+'</table>');

    // attach filter
    $("#searchHosts").on("keyup", function() { filter(this, 'tableHosts'); } )
    $("#searchServices").on("keyup", function() { filter(this, 'tableServices'); } )

    // handle commands
    $("a.command").click(function () {
      a = $(this);
      sendCommand(a.data('command'), a.data('host'), a.data('service') );
    });

    // handle links
    $("a.icinga-link").click(function () { goto( $(this).data('href') ); })
  });
}

/* filter host and service table */
function filter(search, table)
{
  var reg = new RegExp(search.value, "i");

  var enabledHosts = new Array();

  $('#'+table+" tr").each(function() {
    var row = $(this);

    /* normal hostname */
    if ( reg.test(row.attr('data-hostname')) ) {
      $(this).css('display','table-row')
      /* services */
    } else if ( table == 'tableServices' && reg.test(row.attr('data-servicename') ) )  {
      enabledHosts[row.attr('data-hostname')] = 1;
      $(this).css('display','table-row')
      /* none */
    } else {
      $(this).css('display','none')
    }
  });

  /* we have to reenable hosts for services that are shown */
  if ( table == 'tableServices' && Object.keys(enabledHosts).length > 0 ) {
    $('#'+table+" tr").each(function() {
      var row = $(this);
      if ( enabledHosts[row.attr('data-hostname')] === 1 && row.attr('class') == 'host' ) {
        $(this).css('display','table-row');
      }
    });
  }
}

// document is ready, we can start
$(document).ready(function() {
  // show tabs
  $("#tabs").tabs();

  $("a.ext").click(function() { goto(this.href); });

  // draw screen
  show();

  // bind buttons
  $("#refresh-data").click(function() { refresh(); });

  $("img.lazy").lazyload();

});
