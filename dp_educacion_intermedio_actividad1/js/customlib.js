/**
 * Custom library to add custom functionality to activities in this learning object.
 *
 * @author: David Herney
 */
(function(app) {

    /**
     * To handle when an activity has been completed.
     * @param {event} event
     * @param {JQuery object} $el
     * @param {object} args
     */
    function onActivityCompleted(event, $el, args) {
        if (/5-order/.test(args.id) && args.weight > 99) {
            $($el.attr('data-relation')).show();
            return;
        }
    }

    //Register application event handlers
    $(app).on('jpit:activity:completed', onActivityCompleted);
})(dhbgApp);





[{
    campo: ".Ciencias Naturales",
    areas: [
        {nombre: "1.A. Matemática",
        disciplinas: ["Matemáticas puras", "Matemáticas aplicadas", "Estadísticas y probabilidades (Investigación en metodologías)"]},
        {nombre: "1.B. Computación y Ciencias de la Información",
        disciplinas: ["Ciencias de la computación", "Ciencias de la información y bioinformática"]},
        {nombre: "1.C. Ciencias Físicas",
        disciplinas: ["Física atómica, molecular y química", "Física de la materia", "Física de partículas y campo", "Física nuclear", "Física de plasmas y fluidos", "Óptica", "Acústica", "Astronomía"]},
        {nombre: "1.D. Ciencias Químicas",
        disciplinas: ["Química orgánica", "Química inorgánica y nuclear", "Química física", "Ciencias de los polímeros", "Electroquímica", "Química de los coloides", "Química analítica"]},
        {nombre: "1.E. Ciencias de la Tierra y Medioambientales",
        disciplinas: ["Geociencias (multidisciplinario)", "Mineralogía", "Paleontología", "Geoquímica y geofísica", "Geografía física", "Geología", "Vulcanología", "Ciencias del medio ambiente (aspectos sociales)", "Meteorología y ciencias atmosféricas", "Investigación del clima", "Oceanografía, hidrología y recursos del agua"]},
        {nombre: "1.F. Ciencias Biológicas",
        disciplinas: ["Biología celular y microbiología", "Virología", "Bioquímica y biología molecular", "Métodos en investigación en bioquímica", "Micología", "Biofísica", "Genética y herencia (aspectos médicos)", "Biología reproductiva (aspectos médicos)", "Biología del desarrollo", "Botánica y ciencias de las plantas", "Zoología, Ornitología, Entomología, ciencias biológicas del comportamiento", "Biología marina y del agua", "Ecología", "Conservación de la biodiversidad", "Biología (Teoría, matemática, criobiología, evolutiva)", "Otras biologías"]},
        {nombre: "1. G. Otras Ciencias naturales",
        disciplinas: ["Otras ciencias naturales"]}
    ]
},

{
    campo: "2. Ingeniería y Tecnología",
    areas: [
        {nombre: "2.A. Ingeniería Civil",
        disciplinas: ["Ingeniería civil", "Ingeniería arquitectónica", "Ingeniería de la construcción", "Ingeniería estructural y municipal", "Ingeniería de transporte"]},
        {nombre: "2.B. Ingenierías Eléctrica, Electrónica e informática",
        disciplinas: ["Ingeniería eléctrica y electrónica", "Robótica y control automático", "Automatización y sistemas de control", "Ingeniería de sistemas y comunicaciones", "Telecomunicaciones", "Hardware y arquitectura de computadores"]},
        {nombre: "2.C. Ingeniería Mecánica",
        disciplinas: ["Ingeniería mecánica", "Mecánica aplicada", "Termodinámica", "Ingeniería aeroespacial", "Ingeniería nuclear (física nuclear en 1.C)", "Ingeniería del audio"]},
        {nombre: "2.D. Ingeniería Química",
        disciplinas: ["Ingeniería química (plantas y productos)", "Ingeniería de procesos"]},
        {nombre: "2.E. Ingeniería de Materiales",
        disciplinas: ["Ingeniería mecánica", "Cerámicos", "Recubrimiento de películas", "Compuestos (laminados, plásticos reforzados, fibra sintéticas y naturales, e ECA)", "Papel y madera", "Textiles (Nanomateriales y biomateriales)"]},
        {nombre: "2.F. Ingeniería Médica",
        disciplinas: ["Ingeniería médica", "Tecnología médica de laboratorio (análisis de muestras, tecnologías para el diagnóstico)"]},
        {nombre: "2.G. Ingeniería Ambiental",
        disciplinas: ["Ingeniería ambiental y geológica", "Geotécnicas", "Ingeniería de petróleo (combustibles, aceites), energía y combustible", "Sensores remotos", "Minería y procesamiento de minerales", "Ingeniería marina, naves", "Ingeniería oceanográfica"]},
        {nombre: "2.H. Biotecnología ambiental",
        disciplinas: ["Biotecnología ambiental", "Biorremediación, biotecnología para el diagnóstico (Chips ADN y biosensores) en manejo ambiental", "Ética relacionada con biotecnología ambiental"]},
        {nombre: "2.I. Biotecnología Industrial",
        disciplinas: ["Biotecnología industrial", "Tecnología de bioprocesamiento, biocatálisis, fermentación", "Bioproductos (productos que se manufacturan usando biotecnología), biomateriales, bioplásticos, biocombustibles, materiales nuevos bioderivados, químicos finos bioderivados)"]},
        {nombre: "2.J. Nanotecnología",
        disciplinas: ["Nanomateriales (producción y propiedades)", "Nanoprocesos (aplicaciones a nanoescala)"]},
        {nombre: "2. K. Otras Ingenierías y Tecnologías",
        disciplinas: ["Alimentos y bebidas", "Otras ingenierías y tecnologías", "Ingeniería de producción", "Ingeniería industrial"]}
    ]
},

{
    campo: "3. Ciencias Médicas y de la Salud",
    areas: [
        {nombre: "3.A. Medicina Básica",
        disciplinas: ["Anatomía y morfología (ciencias vegetales en)", "Genética humana", "Inmunología", "Neurociencias", "Farmacología y farmacia", "Medicina química", "Toxicología", "Fisiología (incluye citología)", "Patología"]},
        {nombre: "3. B. Medicina Clínica",
        disciplinas: ["Andrología", "Obstetricia y ginecología", "Pediatría", "Cardiovascular", "Vascular periférico", "Hematología", "Respiratoria", "Cuidado crítico y de emergencia", "Anestesiología", "Ortopédica", "Cirugía", "Radiología, medicina nuclear y de imágenes", "Trasplantes", "Odontología, cirugía oral y medicina oral", "Dermatología y enfermedades venéreas", "Alergias", "Reumatología", "Endocrinología y metabolismo (incluye diabetes y trastornos hormonales)", "Gastroenterología y hepatología", "Urología y nefrología", "Oncología", "Oftalmología", "Otorrinolaringología", "Psiquiatría", "Neurología clínica", "Geriatría", "Medicina general e interna", "Otros temas de medicina clínica", "Medicina complementaria (sistemas alternativos)"]},
        {nombre: "3. C. Ciencias de la Salud",
        disciplinas: ["Ciencias del cuidado de la salud y servicios (administración de hospitales, financiamiento)", "Políticas de salud y servicios", "Enfermería", "Nutrición y dietas", "Salud pública", "Medicina tropical", "Parasitología", "Enfermedades infecciosas", "Epidemiología", "Salud ocupacional", "Ciencias del deporte", "Ciencias socio biomédicas (planificación familiar, salud sexual, efectos políticos y sociales de la investigación biomédica)", "Ética", "Abuso de substancias"]},
        {nombre: "3. D. Biotecnología en Salud",
        disciplinas: ["Biotecnología relacionada con la salud", "Tecnologías para la manipulación de células, tejidos, órganos o el organismo (reproducción asistida)", "Tecnología para la identificación y funcionamiento del ADN, proteínas y encimas y como influencian la enfermedad)", "Biomateriales (relacionados con implantes, dispositivos, sensores)", "Ética relacionada con la biomedicina"]},
        {nombre: "3. E. Otras Ciencias Médicas",
        disciplinas: ["Forénsicas", "Otras ciencias médicas", "Fonoaudiología"]
        }
    ]
},

{
    campo: "4. Ciencias Agrícolas",
    areas: [
        {nombre: "4.A. Agricultura, Silvicultura y Pesca",
        disciplinas: ["Agricultura", "Forestal", "Pesca", "Ciencias del suelo", "Horticultura y viticultura", "Agronomía", "Protección y nutrición de las plantas (biotecnología agrícola en 4.D)"]},
        {nombre: "4. B. Ciencias Animales y Lechería",
        disciplinas: ["Ciencias animales y lechería (biotecnología animal en 4.D)"]},
        {nombre: "4. C. Ciencias Veterinarias",
        disciplinas: ["Crías y mascotas", "Ciencias Veterinarias"]},
        {nombre: "4.D. Biotecnología Agrícola",
        disciplinas: ["Biotecnología agrícola y de alimentos", "Tecnología MG (sembradíos y ganado), clonamiento de ganado, selección asistida, diagnóstico (con chips ADN, biosensores)"]},
        {nombre: "4. E. Otras Ciencias Agrícolas",
        disciplinas: ["Ética relacionada a la biotecnología agrícola", "Otras ciencias Agrícolas"]
        }
    ]
},

{
    campo: "5. Ciencias Sociales",
    areas: [
        {nombre: "5.A. Psicología",
        disciplinas: ["Psicología (incluye relaciones hombre- máquina)", "Psicología (incluye terapias de aprendizaje, habla, visual y otras discapacidades físicas y mentales)"]},
        {nombre; "5. B. Economía y Negocios",
        disciplinas: ["Economía", "Econometría", "Relaciones Industriales", "Negocios y management"]},
        {nombre: "5. C. Ciencias de la Educación",
        disciplinas: ["Educación general (incluye capacitación, pedagogía)", "Educación especial (para estudiantes dotados y aquellos con dificultades del aprendizaje)"]},
        {nombre: "5.D. Sociología",
        disciplinas: ["Sociología", "Demografía", "Antropología", "Etnografía", "Temas especiales (Estudios de Género, Temas Sociales, Estudios de la Familia, Trabajo Social)"]},
        {nombre: "5.E. Derecho",
        disciplinas: ["Derecho", "Penal"]},
        {nombre: "5.F. Ciencias Políticas",
        disciplinas: ["Ciencias políticas", "Administración pública", "Teoría organizacional"]},
        {nombre: "5.G. Geografía Social y Económica",
        disciplinas: ["Ciencias ambientales (aspectos sociales)", "Geografía económica y cultural", "Estudios urbanos (planificación y desarrollo)", "Planificación del transporte y aspectos sociales del transporte ingeniería del transporte"]},
        {nombre: "5.H. Periodismo y Comunicaciones",
        disciplinas: ["Periodismo", "Ciencias de la información (aspectos sociales)", "Bibliotecología", "Medios y comunicación social"]},
        {nombre: "5. I. Otras Ciencias Sociales",
        disciplinas: ["Ciencias sociales, interdisciplinaria", "Otras ciencias sociales"]}
    ]
},

{
    campo: "6. Humanidades",
    areas: [
        {nombre: "6. A. Historia y Arqueología",
        disciplinas: ["Historia (Historia de la ciencia y tecnología en 6.C)", "Arqueología", "Historia de Colombia"]},
        {nombre: "6.B. Idiomas y Literatura",
        disciplinas: ["Estudios generales del lenguaje", "Idiomas específicos", "Estudios literarios", "Teoría literaria", "Literatura específica", "Lingüística"]},
        {nombre: "6. C. Otras Historias",
        disciplinas: ["Historia de la ciencia y tecnología", "Otras historias especializadas (Historia del Arte)"]},
        {nombre: "6.D. Arte",
        disciplinas: ["Artes plásticas y visuales", "Música y musicología", "Danza o Artes danzarías", "Teatro, dramaturgia o Artes escénicas", "Otras artes", "Artes audiovisuales", "Arquitectura y urbanismo", "Diseño"]},
        {nombre: "6. E. Otras Humanidades",
        disciplinas: ["Otras Humanidades (Estudios del folclor)", "Filosofía", "Teología"]}
    ]
}

]