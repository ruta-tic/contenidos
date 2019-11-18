/**
 * Custom library to add custom functionality to activities in this learning object.
 *
 * @author: David Herney
 */
(function(app) {

    var MODEDEBUG = 'none';
    var _customdebugdata = {
        "url": "/moodle36",
        "courseId": 4
    };
    var ERROR = 'error';
    var INFO = 'info';
    var _sessionData;
    var _solicitudes = [];
    var _currentSolicitud;
    var _table_solicitudes;
    var _scorm_id_prefix = 'sim-kta';

    function toURLParams(data) {
        var out = [];

        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                out.push(key + '=' + encodeURIComponent(data[key]));
            }
        }

        return out.join('&');
    }

    function getFormData($form){
        var unindexed_array = $form.serializeArray();
        var indexed_array = {};

        $.map(unindexed_array, function(n, i){
            indexed_array[n['name']] = n['value'];
        });

        return indexed_array;
    }

    function getRootURL() {
        // Hack for Moodle.
        if (parent && parent.window.M) {
            M = parent.window.M;

            if (parent.window.scormplayerdata) {
                return M.cfg.wwwroot;
            }
        }

        return '';
    }

    function getAuthUrl() {

        var manifestId = $('body').data().manifestId || '';

        if (MODEDEBUG == 'fake') {
            return getAuthUrlFake();
        } else if (MODEDEBUG == 'custom') {
            return _customdebugdata.url + `/local/tepuy/components/singledb/index.php?uid=${manifestId}&courseid=${_customdebugdata.courseId}`;
        }

        var courseId = parent && parent.window.scormplayerdata ? parent.window.scormplayerdata.courseid : '';
        return getRootURL() + `/local/tepuy/components/singledb/index.php?uid=${manifestId}&courseid=${courseId}`;
    }

    function getDBUrl(op, table, options) {

        var params = {
            'cmid': _sessionData.cmid,
            'op': op,
            'table': table
        };

        for(o in options) {
            params[o] = options[o];
        }

        params = toURLParams(params);

        if (MODEDEBUG == 'fake') {
            return getDBUrlFake();
        } else if (MODEDEBUG == 'custom') {
            return _customdebugdata.url + `/local/tepuy/components/singledb/db.php?${params}`;
        }

        return getRootURL() + `/local/tepuy/components/singledb/db.php?${params}`;
    }

    function getAuthUrlFake() {
        var vars = [], hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for(var i = 0; i < hashes.length; i++)
        {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }

        return "content/json/fakeauth_"+(vars['id']||'notfound')+".json";
    }

    function getDBUrlFake() {
        var vars = [], hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for(var i = 0; i < hashes.length; i++)
        {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }

        return "content/json/fakedb_"+(vars['db']||'notfound')+".json";
    }

    function getAuth() {
        var d = $.Deferred();

        $.getJSON(getAuthUrl())
            .done(function(data) {
                d.resolve(data);
            })
            .fail(function(error){
                d.reject(error);
            });
        return d.promise();
    }

    function connect() {
        connectD = $.Deferred();
        getAuth().then(function(data){
            _sessionData = data;

            if (data.error) {
                showMsg(ERROR, "Hubo un error en el servidor. Por favor salga y vuelva a abrir el juego.");
                console.log('+++++++++++++++ Error ++++++++++++++++++++');
                if (data.debuginfo) {
                    console.log('Debuginfo:');
                    console.log(data.debuginfo);
                }
                if (data.stacktrace) {
                    console.log('Stacktrace:');
                    console.log(data.stacktrace);
                }
                return;
            }

            initialize();
        }, function(err) {
            connectD.reject(err);
        });
        return connectD.promise();
    }

    function showMsg(type, msg) {
        var title = type == ERROR ? "Error" : "Información";
        var $dlg = $(`<div title="${title}"></div>`).html(msg);
        $dlg.dialog({
            modal: true,
            autoOpen: true,
            //width: w_global_modal,
            //height: dhbgApp.documentHeight - 50,
            classes: {
                "ui-dialog": "game-message-dialog"
            },
            close: function() {
                $dlg.dialog('destroy').remove();
            }
        });
    }

    function getFromDB(op, table, options) {
        var d = $.Deferred();

        $.getJSON(getDBUrl(op, table, options))
            .done(function(data) {
                d.resolve(data);
            })
            .fail(function(error){
                d.reject(error);
            });
        return d.promise();
    }

    function setToDB(op, table, options, params) {
        var d = $.Deferred();

        $.post(getDBUrl(op, table, options), params)
            .done(function(data) {
                d.resolve(data);
            })
            .fail(function(error){
                d.reject(error);
            });
        return d.promise();
    }

    /**
     * To handle when an activity has been rendered.
     * @param {event} event
     * @param {JQuery object} $el
     * @param {object} args
     */
    function initialize(data) {

        // Register for scorm.
        _scorm_id_prefix = $('body').data().actId || 'sim-kta';

        if (app.scorm) {
            if (!app.scorm.activities[_scorm_id_prefix]) { app.scorm.activities[_scorm_id_prefix] = []; }
        }

        if (_sessionData.userpicture) {
            $(`<img src="${_sessionData.userpicture}" alt="" />`).appendTo($('.avatar'));
        }

        $('#guardarsolicitud').on('click', function(e) {
            e.preventDefault();

            saveSolicitud(e);

            // Despues de guardar, limpiar el formulario.
            $('#nuevasolicitud button[type="reset"]').trigger('click');
            $('#nuevasolicitud').dialog('close');

            return false;
        });

        $('#btn-ingresar').on('click', function(e) {
            $('body').addClass('logued');
        });

        $('#btn-apoyame').on('click', loadSolicitudes);

        $('#btn-teapoyo').on('click', { "teapoyo": true }, loadSolicitudes);

        $('#guardarcomentario').on('click', saveComentario);

        $('#respondersolicitud').on('click', saveRespuesta);

        $('#borrarsolicitud').on('click', deleteSolicitud);

        $('#cerrarsolicitud').on('click', closeSolicitud);

        $('body').removeClass('loading');
    }

    function loadSolicitudes(event) {
        $('body').addClass('loading');

        var teapoyo = event.data && event.data.teapoyo;
        var options = [];

        if (!teapoyo) {
            options['relatedid'] = _sessionData.userid;
        }

        getFromDB('list', 'solicitudes', options).then(function(data){
            $('body').removeClass('loading');

            if (data.error) {
                showMsg(ERROR, data.error);
                console.log('+++++++++++++++ Error ++++++++++++++++++++');
                if (data.debuginfo) {
                    console.log('Debuginfo:');
                    console.log(data.debuginfo);
                }
                if (data.stacktrace) {
                    console.log('Stacktrace:');
                    console.log(data.stacktrace);
                }
                return;
            }

            var $tablebox = teapoyo ? $('#tablebox-teapoyo') :  $('#tablebox-apoyame');
            $tablebox.empty();

            var $tpl = teapoyo ? $('#tpl-table-teapoyo') : $('#tpl-table-apoyame');
            var $table = $tpl.tmpl(null);
            $tablebox.append($table);

            var $tablebody = $table.find('tbody');
            $tablebody.empty();

            var $item;
            $.each(data, function(r, row) {
                if(!row) {
                    return;
                }

                if(teapoyo && row.relatedid == _sessionData.userid) {
                    return;
                }

                if(teapoyo && row.estado != "Abierta") {
                    return;
                }

                var $tr = $('<tr></tr>');

                $tpl = teapoyo ? $('#tpl-teapoyo-row') : $('#tpl-solicitud-row');
                $item = $tpl.tmpl(row);

                if (row.id) {
                    _solicitudes[row.id] = row;

                    var $detail = $item.find('.operaciones i');
                    $detail.attr('data-record', row.id);
                    $detail.on('click', { "responder": teapoyo }, detailSolicitud);
                } else {
                    $item.find('.operaciones i').hide();
                }

                $tablebody.append($item);
            });

            _table_solicitudes = $table.dataTable({
                "destroy": true,
                "language": {
                    "url": "https://cdn.datatables.net/plug-ins/1.10.20/i18n/Spanish.json"
                }
            });

        }, function(err) {
            $('body').removeClass('loading');
            showMsg(ERROR, 'Hubo un error. Por favor intente de nuevo.');
            console.log(err)
        });
    }

    function detailSolicitud(event) {
        var $this = $(this);

        _currentSolicitud = $this.attr('data-record');
        var data = _solicitudes[_currentSolicitud];

        $('#cerrarsolicitud').hide();
        $('#borrarsolicitud').hide();

        if (data.solicitanteid == _sessionData.userid) {
            $('#borrarsolicitud').show();

            if (data.estado == 'Abierta') {
                $('#cerrarsolicitud').show();
            }
        }

        var $tpl = $('#tpl-solicitud');
        var $item = $tpl.tmpl(data);

        $('#solicitud-detalles .generales').empty();
        $('#solicitud-detalles .generales').append($item);

        $('#solicitud-detalles .conceptos').empty();
        $.each(data.conceptos, function(i, concepto) {
            if (!concepto) { return; }

            $tpl = $('#tpl-concepto');
            $item = $tpl.tmpl(concepto);
            $('#solicitud-detalles .conceptos').append($item);

        });

        $('#solicitud-detalles .conceptos').accordion("refresh");

        $('#solicitud-detalles .comentarios').empty();
        $.each(data.comentarios, function(i, comentario) {
            if (!comentario) { return; }

            $tpl = $('#tpl-comentario');
            $item = $tpl.tmpl(comentario);
            $('#solicitud-detalles .comentarios').append($item);

        });

        if (event.data && event.data.responder) {
            $('#solicitud-detalles').removeClass('paraapoyame');
            $('#solicitud-detalles').addClass('parateapoyo');
        } else {
            $('#solicitud-detalles').removeClass('parateapoyo');
            $('#solicitud-detalles').addClass('paraapoyame');
        }

        $('#solicitud-detalles').dialog('open');
    }

    function saveSolicitud(event) {
        $('body').addClass('loading');

        var solicitud = getFormData($( "#form-nuevasolicitud" ));
        solicitud.estado = "Abierta";
        solicitud.conceptos = [];
        solicitud.comentarios = [];
        solicitud.solicitante = _sessionData.usernames;
        solicitud.solicitanteid = _sessionData.userid;

        var params = { "fields": JSON.stringify(solicitud), "relatedid": _sessionData.userid };

        setToDB('save', 'solicitudes', null, params).then(function(data){
            $('body').removeClass('loading');

            if (data.error) {
                showMsg(ERROR, data.error);
                console.log('+++++++++++++++ Error ++++++++++++++++++++');
                if (data.debuginfo) {
                    console.log('Debuginfo:');
                    console.log(data.debuginfo);
                }
                if (data.stacktrace) {
                    console.log('Stacktrace:');
                    console.log(data.stacktrace);
                }
                return;
            }

            if (data.id && dhbgApp.scorm) {
                dhbgApp.scorm.activityAttempt(_scorm_id_prefix, 100, null, 'Creó solicitud: ' + data.id);
            }

            loadSolicitudes(event);

        }, function(err) {
            $('body').removeClass('loading');
            showMsg(ERROR, 'Hubo un error. Por favor intente de nuevo.');
            console.log(err)
        });

    }

    function saveComentario(event) {
        event.preventDefault();
        $('body').addClass('loading');

        var comentario = getFormData($( "#form-comentar" ));
        comentario.fecha = new Date(Date.now()).toLocaleString();
        comentario.usuario = _sessionData.usernames;
        comentario.usuarioid = _sessionData.userid;

        var params = { "fields": JSON.stringify(comentario), "id": _currentSolicitud, "to": "comentarios" };

        setToDB('set', 'solicitudes', null, params).then(function(data){
            $('body').removeClass('loading');

            if (data.error) {
                showMsg(ERROR, data.error);
                console.log('+++++++++++++++ Error ++++++++++++++++++++');
                if (data.debuginfo) {
                    console.log('Debuginfo:');
                    console.log(data.debuginfo);
                }
                if (data.stacktrace) {
                    console.log('Stacktrace:');
                    console.log(data.stacktrace);
                }
                return;
            }

            _solicitudes[_currentSolicitud].comentarios[_solicitudes[_currentSolicitud].comentarios.length] = comentario;
            $tpl = $('#tpl-comentario');
            $item = $tpl.tmpl(comentario);
            $('#solicitud-detalles .comentarios').append($item);

            $('#form-comentar button[type="reset"]').trigger('click');


        }, function(err) {
            $('body').removeClass('loading');
            showMsg(ERROR, 'Hubo un error. Por favor intente de nuevo.');
            console.log(err)
        });

    }

    function saveRespuesta(event) {
        event.preventDefault();
        $('body').addClass('loading');

        var concepto = getFormData($( "#form-conceptos" ));
        concepto.fecha = new Date(Date.now()).toLocaleString();
        concepto.usuario = _sessionData.usernames;
        concepto.usuarioid = _sessionData.userid;

        var params = { "fields": JSON.stringify(concepto), "id": _currentSolicitud, "to": "conceptos" };

        setToDB('set', 'solicitudes', null, params).then(function(data){
            $('body').removeClass('loading');

            if (data.error) {
                showMsg(ERROR, data.error);
                console.log('+++++++++++++++ Error ++++++++++++++++++++');
                if (data.debuginfo) {
                    console.log('Debuginfo:');
                    console.log(data.debuginfo);
                }
                if (data.stacktrace) {
                    console.log('Stacktrace:');
                    console.log(data.stacktrace);
                }
                return;
            }

            if (dhbgApp.scorm) {
                dhbgApp.scorm.activityAttempt(_scorm_id_prefix, 100, null, 'Respondió a solicitud: ' + _currentSolicitud);
            }

            _solicitudes[_currentSolicitud].conceptos[_solicitudes[_currentSolicitud].conceptos.length] = concepto;
            $tpl = $('#tpl-concepto');
            $item = $tpl.tmpl(concepto);
            $('#solicitud-detalles .conceptos').append($item);

            $('#form-conceptos button[type="reset"]').trigger('click');
            $('.tab-respuestas').trigger('click');


        }, function(err) {
            $('body').removeClass('loading');
            showMsg(ERROR, 'Hubo un error. Por favor intente de nuevo.');
            console.log(err)
        });

    }

    function deleteSolicitud(event) {
        event.preventDefault();
        $('body').addClass('loading');

        var r = confirm("¿Está seguro de borrar la solicitud?");
        if (r !== true) {
            $('body').removeClass('loading');
            return;
        }

        var params = { "id": _currentSolicitud };

        setToDB('delete', 'solicitudes', null, params).then(function(data){
            $('body').removeClass('loading');

            if (data.error) {
                showMsg(ERROR, data.error);
                console.log('+++++++++++++++ Error ++++++++++++++++++++');
                if (data.debuginfo) {
                    console.log('Debuginfo:');
                    console.log(data.debuginfo);
                }
                if (data.stacktrace) {
                    console.log('Stacktrace:');
                    console.log(data.stacktrace);
                }
                return;
            }

            $('#solicitud-detalles').dialog('close');
            loadSolicitudes(event);

        }, function(err) {
            $('body').removeClass('loading');
            showMsg(ERROR, 'Hubo un error. Por favor intente de nuevo.');
            console.log(err)
        });

    }

    function closeSolicitud(event) {
        event.preventDefault();
        $('body').addClass('loading');

        var r = confirm("¿Está seguro de cerrar la solicitud? Una vez cerrada no podrá volverla a abrir.");
        if (r !== true) {
            $('body').removeClass('loading');
            return;
        }

        var params = { "id": _currentSolicitud, 'fields': '{"estado" : "Cerrada"}' };

        setToDB('change', 'solicitudes', null, params).then(function(data){
            $('body').removeClass('loading');

            if (data.error) {
                showMsg(ERROR, data.error);
                console.log('+++++++++++++++ Error ++++++++++++++++++++');
                if (data.debuginfo) {
                    console.log('Debuginfo:');
                    console.log(data.debuginfo);
                }
                if (data.stacktrace) {
                    console.log('Stacktrace:');
                    console.log(data.stacktrace);
                }
                return;
            }

            $('#solicitud-detalles').dialog('close');
            loadSolicitudes(event);

        }, function(err) {
            $('body').removeClass('loading');
            showMsg(ERROR, 'Hubo un error. Por favor intente de nuevo.');
            console.log(err)
        });

    }

    $( document ).ready(function() {
        connect().then(function(data) {
            console.log('Connected');
        }, function(err) {
            showMsg(ERROR, "Hubo un error en la conexión. Por favor salga y vuelva a abrir el juego.");
            console.log('Failed to connect to: ' + getAuthUrl());
            console.log(err);
        });
    });

})(dhbgApp);

