'use strict';
'require view';
'require form';
'require uci';
'require fs';

function _unwrap(v) {
    if (v && typeof v === 'object' && v.data != null)
        return v.data;
    return v;
}

function _trim(v) {
    v = _unwrap(v);
    return (v == null) ? null : String(v).trim();
}

function _toInt(v) {
    v = _trim(v);
    if (v == null || v === '')
        return NaN;
    var n = parseInt(v, 10);
    return isNaN(n) ? NaN : n;
}

async function safeRead(path) {
    if (!path)
        return null;
    try {
        return await fs.read(path);
    } catch (e) {}
    
    if (typeof fs.read_direct === 'function') {
        try {
            return await fs.read_direct(path);
        } catch (e) {}
    }
    return null;
}

return view.extend({
    load: function() {
        return uci.load('fancontrol');
    },

    render: async function() {
        var m = new form.Map('fancontrol', _('Fan General Control'));
        var secs = uci.sections('fancontrol', 'fancontrol') || [];
        var secname = secs.length ? secs[0]['.name'] : 'settings';

        var s = m.section(form.TypedSection, 'fancontrol', _('Settings'));
        s.anonymous = true;
        s.addremove = false;

        var oEnabled = s.option(form.Flag, 'enabled', _('Enabled'));
        oEnabled.rmempty = false;

        var oThermal = s.option(form.Value, 'thermal_file', _('Thermal File'));
        oThermal.placeholder = '/sys/devices/virtual/thermal/thermal_zone0/temp';

        var oFan = s.option(form.Value, 'fan_file', _('Fan File'), _('Fan Speed File'));
        oFan.placeholder = '/sys/devices/virtual/thermal/cooling_device0/cur_state';

        var oStartTemp = s.option(form.Value, 'start_temp', _('Start Temperature'), _('Please enter the fan start temperature.'));
        oStartTemp.placeholder = '45';
        oStartTemp.datatype = 'uinteger';

        var oStartSpeed = s.option(form.Value, 'start_speed', _('Initial Speed'), _('Please enter the initial speed for fan startup.'));
        oStartSpeed.placeholder = '35';
        oStartSpeed.datatype = 'uinteger';

        var oMaxSpeed = s.option(form.Value, 'max_speed', _('Max Speed'), _('Please enter maximum fan speed.'));
        oMaxSpeed.placeholder = '255';
        oMaxSpeed.datatype = 'uinteger';

        var tpath = uci.get('fancontrol', secname, 'thermal_file');
        var fpath = uci.get('fancontrol', secname, 'fan_file');
        
        var divv = _toInt(uci.get('fancontrol', secname, 'temp_div'));
        if (isNaN(divv) || divv <= 0)
            divv = 1000;

        var tRaw = _toInt(await safeRead(tpath));
        if (!isNaN(tRaw)) {
            var tC = tRaw / divv;
            oThermal.description = _('Current temperature:') + ' ' + tC.toFixed(1) + '\u00B0C';
        } else {
            oThermal.description = _('Current temperature:') + ' N/A';
        }

        var fRaw = _toInt(await safeRead(fpath));
        oFan.description = _('Current speed:') + ' ' + (isNaN(fRaw) ? 'N/A' : String(fRaw));

        return m.render();
    }
});
