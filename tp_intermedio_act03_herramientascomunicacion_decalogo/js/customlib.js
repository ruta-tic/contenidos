/**
 * Custom library to add custom functionality to activities in this learning object.
 *
 * @author: Jesus Otero
 */
(function(app) {
    function initializeResize($img) {
        var newImg = new Image();
        newImg.onload = function() {
            $img.data('o_width', newImg.width);
            scaleMap($img);
        }
        newImg.src = $img.attr('src'); // this must be done AFTER setting onload
    }

    function enableMapResize($images) {
        $('area').each(function(i, area) {
            $(area).data('coords', $(area).attr('coords'));
        });

        $images.each(function(i, img) {
            initializeResize($(img));
        });
    }

    function scaleMap($img) {
        var mapName  = $img.attr('usemap').replace('#', ''),
            $map      = $('map[name="' + mapName + '"]');

        var resize = function () {
            scale = $img.width() / $img.data('o_width');
            if (scale == $img.data('scale')) return;

            $map.find('area').each(function(i, area) {
                var $area = $(area),
                 coords = $area.data('coords').split(','),
                 newCoords = [];
                 $.each(coords, function(k, coord) {
                     newCoords.push(coord * scale);
                 })
                 $area.attr('coords', newCoords.join(','));
            });

            $img.data('scale', scale);
        }

        window.onresize = function () {
            setTimeout(resize, 100);
        }

        //Required because the image has no size if the div is not visible
        $(document).on('click', '.chalkboard_item.button,.element_left.button', function() {
            var $this = $(this);
            if ($this.is('.chalkboard_item') && $this.index() == 1 || $this.is('.element_left') && $this.parent().index() == 1) {
                setTimeout(resize, 100);
            }
        })
        resize();
    }

    /**
     * Register handler to show interactice decalog builder.
     */
    $(document).ready(function(){
        $(".decalog_builder").on('click', 'input', function() {
            var $builder = $(".decalog_builder"),
                $who = $builder.find("input[name='interaction_who']:checked"),
                $type = $builder.find("input[name='interaction_type']:checked"),
                $where = $builder.find("input[name='interaction_where']:checked");

            if (!$who.length || !$type.length || !$where.length) return;

            var $dialog = $('#ventana_decalogo');
            $dialog.find("#interaction_who").html($who.val());
            $dialog.find("#interaction_type").html($type.val());
            $dialog.find("#interaction_where").html($where.val());
            $builder.next('button.decalogo').trigger('click');
        });
        //resize image map accordingly
        enableMapResize($('img[usemap]'));
    });

})(dhbgApp);
