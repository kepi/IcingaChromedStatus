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

  this.addHost = function(host, statusclass)
  {
    // TODO: vyresit dalsi stavy
    if ( statusclass == 'statusOdd' || statusclass == 'statusEven' )
      state = HSTATE_UP;
    else
      state = HSTATE_DOWN;

    host.setState(state);

    this.hosts[host.name] = host;
  }

  this.countTotals = function()
  {
    // set needed variables
    this.totals_hosts = {0: 0, 1: 0, 4: 0, 8: 0};
    this.totals_services = {0: 0, 1: 0, 2: 0, 4: 0, 8: 0};
    this.worst_host = 0;
    this.worst_service = 0;

    // cycle through all hosts
    for (var h in this.hosts) {
      var host = this.hosts[h];

      // get service states array 
      var states = host.getState('states_array');

      // find worst host state
      if ( host.state > this.worst_host  )
        this.worst_host = host.state;

      // find worst service state
      if ( states.WORST > this.worst_service )
        this.worst_service = states.WORST;
    
      // sum it
      this.totals_hosts[host.state] += 1;
      this.totals_services[STATE_OK] += states[STATE_OK];
      this.totals_services[STATE_PEND] += states[STATE_PEND];
      this.totals_services[STATE_UNKN] += states[STATE_UNKN];
      this.totals_services[STATE_WARN] += states[STATE_WARN];
      this.totals_services[STATE_CRIT] += states[STATE_CRIT];
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

    return {hosts: hosts, totals_hosts: this.totals_hosts, totals_services: this.totals_services};
  }
}

function Host(name, link) 
{
  this.name = name;
  this.link = link;
  this.services = new Array;
  this.state = STATE_OK;
  this.service_states = {HOST: this.state, WRONG: 0, WORST: 0, 0: 0, 1: 0, 2: 0, 4: 0, 8: 0};

  this.setState = function(state)
  {
    this.state = state;
    this.service_states.HOST = state;
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
    // only host state, we can return
    if ( what == 'own' )
      return this.state;

    // TODO: cachovat

    // we have to check for state
    for (var s in this.services) {
      // count this state
      ++this.service_states[this.services[s].state];
      // count all wrong states
      if ( this.services[s].state > STATE_OK )
        ++this.service_states.WRONG;
      // set worst state
      if ( this.services[s].state > this.service_states.WORST )
        this.service_states.WORST = this.services[s].state;
    }

    // default - return false if anything is wrong
    if ( what == undefined ) {
      return ( this.state == STATE_OK && this.service_states.WRONG == 0 )  ? true : false;
    } else if ( what == 'worst' ) {
      return this.service_states.WORST;
    } else if ( what == 'states_array' ) {
      return this.service_states;
    }

  }

  this.toJSON = function(options)
  {
    var services = [];
    for (var s in this.services)
      services.push(this.services[s].toJSON(options));

    var states = this.getState('states_array');
    console.log(states);
    
    return {name: this.name, link: this.link, services: services, states: states};
  }
}

function Service(name, link, state) 
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

  this.toJSON = function(options)
  {
    return {name: this.name, link: this.link, state: this.state.toString()};
  }
}
