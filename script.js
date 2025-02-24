document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("archivo");
    const formContainer = document.getElementById("campos-dinamicos");
    const procesarBtn = document.getElementById("procesar");
    let etiquetasDetectadas = new Set(); // Para almacenar las etiquetas encontradas
    let archivosSeleccionados = []; // Para almacenar los archivos subidos

    // 📌 Detectar etiquetas en los archivos seleccionados
    fileInput.addEventListener("change", async (event) => {
        etiquetasDetectadas.clear(); // Reiniciar etiquetas
        archivosSeleccionados = Array.from(event.target.files); // Guardar archivos
    
        if (archivosSeleccionados.length === 0) return;
    
        console.log(`📂 ${archivosSeleccionados.length} archivos seleccionados`);
    
        for (let archivo of archivosSeleccionados) {
            const reader = new FileReader();
            reader.readAsArrayBuffer(archivo);
    
            reader.onload = async (e) => {
                try {
                    const buffer = e.target.result;
                    const zipFile = new window.PizZip(buffer);
                    const doc = new window.docxtemplater(zipFile);
    
                    // Obtener el contenido del cuerpo del documento
                    let text = doc.getFullText(); 
    
                    // 📌 Extraer nombres de archivos de encabezado y pie de página
                    const headerNames = Object.keys(zipFile.files).filter(name => name.match(/word\/header\d+\.xml/));
                    const footerNames = Object.keys(zipFile.files).filter(name => name.match(/word\/footer\d+\.xml/));
    
                    // 📌 Leer y procesar cada archivo de encabezado
                    for (let headerName of headerNames) {
                        const headerXml = zipFile.file(headerName).asText();
                        text += `\n${headerXml.replace(/<[^>]+>/g, "")}`; // Eliminar etiquetas XML
                    }
    
                    // 📌 Leer y procesar cada archivo de pie de página
                    for (let footerName of footerNames) {
                        const footerXml = zipFile.file(footerName).asText();
                        text += `\n${footerXml.replace(/<[^>]+>/g, "")}`; // Eliminar etiquetas XML
                    }
    
                    // Buscar etiquetas con el formato [[etiqueta]]
                    const etiquetasEncontradas = text.match(/\[\[(.*?)\]\]/g);
    
                    if (etiquetasEncontradas) {
                        etiquetasEncontradas.forEach(etiqueta => etiquetasDetectadas.add(etiqueta.replace(/\[\[|\]\]/g, "")));
                    }
    
                    generarFormularioDinamico();
                } catch (error) {
                    console.error(`❌ Error al leer etiquetas en ${archivo.name}:`, error);
                }
            };
        }
    });
    
    
    

    // 📌 Generar formulario dinámico con las etiquetas detectadas
    function generarFormularioDinamico() {
        formContainer.innerHTML = ""; // Limpiar formulario anterior

        if (etiquetasDetectadas.size > 0) {
            etiquetasDetectadas.forEach(etiqueta => {
                const div = document.createElement("div");
                div.innerHTML = `
                    <label for="${etiqueta}">${etiqueta}:</label>
                    <input type="text" id="${etiqueta}" name="${etiqueta}" required>
                    <br><br>
                `;
                formContainer.appendChild(div);
            });

            procesarBtn.style.display = "block"; // Mostrar botón de procesar
        } else {
            formContainer.innerHTML = "<p>No se detectaron etiquetas en los archivos seleccionados.</p>";
            procesarBtn.style.display = "none"; // Ocultar botón si no hay etiquetas
        }
    }

    // 📌 Procesar archivos con los valores ingresados
    procesarBtn.addEventListener("click", async () => {
        if (archivosSeleccionados.length === 0) {
            alert("No hay archivos seleccionados.");
            return;
        }

        const valores = {};
        etiquetasDetectadas.forEach(etiqueta => {
            valores[etiqueta] = document.getElementById(etiqueta).value;
        });

        console.log("📝 Valores ingresados:", valores);

        const zip = new JSZip();
        let archivosProcesados = 0;

        for (let archivo of archivosSeleccionados) {
            console.log(`📄 Procesando: ${archivo.name}`);

            const reader = new FileReader();
            reader.readAsArrayBuffer(archivo);

            reader.onload = async (e) => {
                try {
                    const buffer = e.target.result;
                    const zipFile = new window.PizZip(buffer);
                    const doc = new window.docxtemplater(zipFile, {
                        delimiters: { start: "[[" , end: "]]" },
                        paragraphLoop: true,
                        parser: tag => ({ get: scope => scope[tag] }),
                        nullGetter: () => "",
                        linebreaks: true
                    });

                    // Reemplazar etiquetas con los valores ingresados
                    doc.render(valores);

                    // Generar el nuevo archivo .docx
                    const blob = new Blob([doc.getZip().generate({ type: "arraybuffer" })], {
                        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    });

                    // Agregar archivo al ZIP con el mismo nombre original
                    zip.file(archivo.name, blob);
                    console.log(`✅ ${archivo.name} añadido al ZIP`);

                    archivosProcesados++;

                    // Si todos los archivos han sido procesados, generar y descargar el ZIP
                    if (archivosProcesados === archivosSeleccionados.length) {
                        zip.generateAsync({ type: "blob" }).then((zipBlob) => {
                            window.saveAs(zipBlob, "memorias_actualizadas.zip");
                            console.log("📦 ZIP descargado: memorias_actualizadas.zip");
                        });
                    }
                } catch (error) {
                    console.error(`❌ Error al procesar ${archivo.name}:`, error);
                    alert(`Hubo un error con el archivo: ${archivo.name}`);
                }
            };
        }
    });
});
