(function() {
    var params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
    var urlParams = new URLSearchParams(window.location.search);

    // 1. Guardar en Storage (Persistencia)
    for (var i = 0; i < params.length; i++) {
        var p = params[i];
        var v = urlParams.get(p);
        if (v) localStorage.setItem('store_' + p, v);
    }

    // 2. Inyectar en los campos inmediatamente al cargar la página
    function prepararFormulario() {
        var isAds = !!(urlParams.get('gclid') || localStorage.getItem('store_gclid'));
        var hasUtms = !!(urlParams.get('utm_source') || localStorage.getItem('store_utm_source'));

        var forms = document.querySelectorAll('form');
        forms.forEach(function(form) {
            params.forEach(function(p) {
                var val = localStorage.getItem('store_' + p) || "sin_especificar";
                if (p === 'utm_source') {
                    val = isAds ? "paid_media" : (hasUtms ? "utm_manual" : "organico");
                }

                // Buscamos o creamos el campo ANTES del envío
                var input = form.querySelector('input[name="' + p + '"]');
                if (!input) {
                    input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = p;
                    form.appendChild(input);
                }
                input.value = val;
            });
        });
    }

    // Ejecutar al cargar para que los campos estén listos antes de que se envíe el formulario
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', prepararFormulario);
    } else {
        prepararFormulario();
    }
})();
