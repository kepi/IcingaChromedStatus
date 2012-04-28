// some helper constants
const STATE_OK   = 0;
const STATE_PEND = 1;
const STATE_UNKN = 2;
const STATE_WARN = 4;
const STATE_CRIT = 8;

const HSTATE_UP   = 0;
const HSTATE_PEND = 1;
const HSTATE_UNR  = 4;
const HSTATE_DOWN = 8;

var debug = false;

function debug_log(msg)
{
  if(debug) { console.log(msg) }
}


function clearBadge()
{
  chrome.browserAction.setBadgeText({text: ''});
}

function errorBadge()
{
  chrome.browserAction.setBadgeText({text: 'ERR'});
  color = [255, 51, 0, 255];
  chrome.browserAction.setBadgeBackgroundColor({color: color});
}

function stateClass(state, full)
{
  var classes = full == undefined ? {0: 'ok', 1: 'pend', 2: 'unkn', 4: 'warn', 8: 'cri'} : {0: 'ok', 1: 'pending', 2: 'unknown', 4: 'warning', 8: 'critical'};
  return classes[state];
}

function Hosts()
{
  this.hosts = [];
  this.totals_hosts = {0: 0, 1: 0, 4: 0, 8: 0};
  this.totals_services = {0: 0, 1: 0, 2: 0, 4: 0, 8: 0};

  this.addHost = function(host, statusclass, ack, downtime)
  {
    // TODO: vyresit dalsi stavy
    if ( statusclass == 'statusOdd' || statusclass == 'statusEven' )
      state = HSTATE_UP;
    else
      state = HSTATE_DOWN;

    host.setState(state, ack, downtime);

    this.hosts[host.name] = host;
  }

  this.countTotals = function()
  {
    // set needed variables
    this.totals_hosts = {0: 0, 1: 0, 4: 0, 8: 0};
    this.totals_services = {0: 0, 1: 0, 2: 0, 4: 0, 8: 0};

    this.totals_all_hosts = {0: 0, 1: 0, 4: 0, 8: 0};
    this.totals_all_services = {0: 0, 1: 0, 2: 0, 4: 0, 8: 0};

    this.worst_host = 0;
    this.worst_service = 0;

    this.worst_all_host = 0;
    this.worst_all_service = 0;

    // cycle through all hosts
    for (var h in this.hosts) {
      var host = this.hosts[h];

      // get service states array 
      var states = host.getState('states_array');

      // find worst host state
      if ( !host.ack && !host.downtime && host.state > this.worst_host  )
        this.worst_host = host.state;

      // find worst service state
      if ( states.WORST > this.worst_service )
        this.worst_service = states.WORST;

      // sum it
      hostState = (host.ack || host.downtime) ? 0 : host.state;
      this.totals_hosts[hostState] += 1;
      this.totals_services[STATE_OK] += states[STATE_OK];
      this.totals_services[STATE_PEND] += states[STATE_PEND];
      this.totals_services[STATE_UNKN] += states[STATE_UNKN];
      this.totals_services[STATE_WARN] += states[STATE_WARN];
      this.totals_services[STATE_CRIT] += states[STATE_CRIT];

      // get service states_all array 
      var states_all = host.getState('states_array_all');

      // find worst_all host state
      if ( host.state > this.worst_all_host  )
        this.worst_all_host = host.state;

      // find worst_all service state
      if ( states_all.WORST > this.worst_all_service )
        this.worst_all_service = states_all.WORST;

      // sum it
      this.totals_all_hosts[host.state] += 1;
      this.totals_all_services[STATE_OK] += states_all[STATE_OK];
      this.totals_all_services[STATE_PEND] += states_all[STATE_PEND];
      this.totals_all_services[STATE_UNKN] += states_all[STATE_UNKN];
      this.totals_all_services[STATE_WARN] += states_all[STATE_WARN];
      this.totals_all_services[STATE_CRIT] += states_all[STATE_CRIT];
    }
  }

  this.setBadge = function()
  {
    this.countTotals();
    var worst_count;
    var worst_state;
    if ( this.worst_host >= this.worst_service ) {
      worst_state = this.worst_host;
      worst_count = this.totals_hosts[this.worst_host];
    } else {
      worst_state = this.worst_service;
      worst_count = this.totals_services[this.worst_service];
    }

    chrome.browserAction.setBadgeText({text: worst_count.toString()});

    if ( worst_state == STATE_CRIT )
      color = [255, 51, 0, 255];
    else if ( worst_state == STATE_WARN )
      color = [255, 165, 0, 255];
    else if ( worst_state == STATE_UNKN )
      color = [191, 68, 178, 255];
    else if ( worst_state == STATE_OK )
      color = [0, 204, 51, 255];
    else
      color = [233, 233, 233, 255];

    chrome.browserAction.setBadgeBackgroundColor({color: color});
  }

  this.getHost = function(name)
  {
    return this.hosts[name];
  }

  this.toJSON = function(options)
  {
    var hosts = [];
    for (var h in this.hosts) {
      pushit = true;

      if ( options != undefined && options.warned == true )
        pushit = this.hosts[h].getState() ? false : true;

      if ( pushit )
        hosts.push(this.hosts[h].toJSON(options));
    }

    return {hosts: hosts, totals_hosts: this.totals_hosts, totals_services: this.totals_services, 
              totals_all_hosts: this.totals_all_hosts, totals_all_services: this.totals_all_services};
  }
}

function Host(name, link)
{
  this.name = name;
  this.link = link;
  this.services = new Array;
  this.state = STATE_OK;
  this.ack = ack;
  this.downtime = downtime;
  this.service_states = {HOST: 0, WRONG: 0, WORST: 0, 0: 0, 1: 0, 2: 0, 4: 0, 8: 0};
  this.service_states_all = {HOST: 0, WRONG: 0, WORST: 0, 0: 0, 1: 0, 2: 0, 4: 0, 8: 0};

  this.setState = function(state, ack, downtime)
  {
    this.ack = ack;
    this.downtime = downtime;
    this.state = state;

    this.service_states.HOST = (this.ack || this.downtime) ? 0 : state;
    this.service_states_all.HOST = state;
  }

  this.addService = function(service)
  {
    this.services[service.name] = service;
  }

  this.getService = function(name)
  {
    return this.services[name];
  }

  this.getState = function(what)
  {
    // TODO: cachovat

    // we need to reset it
    this.service_states = {HOST: 0, WRONG: 0, WORST: 0, 0: 0, 1: 0, 2: 0, 4: 0, 8: 0};
    this.service_states_all = {HOST: 0, WRONG: 0, WORST: 0, 0: 0, 1: 0, 2: 0, 4: 0, 8: 0};

    // we have to check for state
    for (var s in this.services) {
      // count this state
      ++this.service_states_all[this.services[s].state];
      // count all wrong states_all
      if ( this.services[s].state > STATE_OK )
        ++this.service_states_all.WRONG;

      // set worst state
      if ( this.services[s].state > this.service_states_all.WORST )
        this.service_states_all.WORST = this.services[s].state;

      if ( !this.services[s].ack && !this.services[s].downtime ) {
        // count this state
        ++this.service_states[this.services[s].state];
        // count all wrong states
        if ( this.services[s].state > STATE_OK )
          ++this.service_states.WRONG;
        // set worst state
        if ( this.services[s].state > this.service_states.WORST )
          this.service_states.WORST = this.services[s].state;
      }
    }

    // default - return false if anything is wrong
    if ( what == undefined ) {
      return ( this.state == STATE_OK && this.service_states.WRONG == 0 )  ? true : false;
    } else if ( what == 'states_array' ) {
      return this.service_states;
    } else if ( what == 'states_array_all' ) {
      return this.service_states_all;
    }

/*
    } else if ( what == 'worst' ) {
      return this.service_states.WORST;
    } else if ( what == 'worst_all' ) {
      return this.service_states_all.WORST;
      */
  }

  this.toJSON = function(options)
  {
    var services = [];
    for (var s in this.services)
      services.push(this.services[s].toJSON(options));

    var states = this.getState('states_array');
    var states_all = this.getState('states_array_all');

    return {name: this.name, link: this.link, services: services, ack: this.ack, downtime: this.downtime, state: this.state, states: states, states_all: states_all};
  }
}

function Service(name, link, state, ack, downtime) 
{

  if ( state == 'OK' )
    this.state = STATE_OK;
  else if ( state == 'CRITICAL' )
    this.state = STATE_CRIT;
  else if ( state == 'WARNING' )
    this.state = STATE_WARN;
  else if ( state == 'UNKNOWN' )
    this.state = STATE_UNKN;
  else if ( state == 'PENDING' )
    this.state = STATE_PEND;

  this.name = name;
  this.link = link;
  this.ack = ack;
  this.downtime = downtime;

  this.toJSON = function(options)
  {
    return {name: this.name, link: this.link, state: this.state.toString(), ack: this.ack, downtime: this.downtime};
  }
}
