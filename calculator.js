// Calculadora de Acuerdos de Pago
class PaymentAgreementCalculator {
    constructor() {
        this.debtData = {};
        this.selectedPlan = null;
        this.installments = 1;
        this.webhookUrl = null; // Se cargará desde el API route
        this.firstPaymentDate = null; // Fecha del primer pago
        
        this.init();
    }

    async init() {
        // Cargar configuración del webhook (no bloquear si falla)
        this.loadWebhookConfig().catch(err => {
            console.warn('Configuración de webhook no disponible, usando fallback');
        });
        
        this.loadUrlParameters();
        this.setupEventListeners();
        this.renderInterface();
    }

    // Cargar configuración del webhook desde API route
    async loadWebhookConfig() {
        try {
            const response = await fetch('/api/config');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.webhookUrl) {
                this.webhookUrl = data.webhookUrl;
                console.log('✅ Webhook URL cargada desde configuración');
            } else {
                throw new Error('No se recibió webhookUrl en la respuesta');
            }
        } catch (error) {
            console.error('⚠️ Error cargando configuración del webhook:', error);
            console.warn('Usando URL fallback. Configura WEBHOOK_URL en Vercel para que funcione correctamente.');
            
            // Fallback a URL placeholder si falla la carga
            this.webhookUrl = 'https://tu-webhook-n8n.com/webhook/acuerdos-pago';
        }
    }

    // Cargar parámetros de la URL
    loadUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        const requiredParams = ['capital', 'intereses', 'costos'];
        const missingParams = [];

        // Validar parámetros requeridos
        requiredParams.forEach(param => {
            const value = urlParams.get(param);
            if (!value || isNaN(value) || parseFloat(value) < 0) {
                missingParams.push(param);
            } else {
                this.debtData[param] = parseFloat(value);
            }
        });

        // Cargar parámetros informativos
        this.debtData.fechaInicio = urlParams.get('fechaInicio') || null;
        this.debtData.diasMora = urlParams.get('diasMora') || null;
        this.debtData.cuotaAnterior = urlParams.get('cuotaAnterior') || null;
        
        // Cargar UUID del deudor (no se muestra pero se envía en webhook)
        this.debtData.uuid = urlParams.get('uuid') || null;

        // Mostrar error si faltan parámetros
        if (missingParams.length > 0) {
            this.showError(missingParams);
            return;
        }

        // Mostrar contenido principal
        document.getElementById('main-content').style.display = 'block';
    }

    // Mostrar mensaje de error
    showError(missingParams) {
        const errorDiv = document.getElementById('error-message');
        const paramsList = document.getElementById('missing-params');
        
        if (!errorDiv || !paramsList) {
            console.error('Error: No se encontraron los elementos para mostrar el error');
            return;
        }
        
        // Limpiar lista anterior
        paramsList.innerHTML = '';
        
        missingParams.forEach(param => {
            const li = document.createElement('li');
            li.textContent = `• ${param}`;
            paramsList.appendChild(li);
        });

        errorDiv.style.display = 'block';
        
        // Asegurarse de que el contenido principal esté oculto
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.display = 'none';
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        // Slider para deudas menores a $1M
        const slider = document.getElementById('installments-slider');
        if (slider) {
            slider.addEventListener('input', (e) => {
                this.installments = parseInt(e.target.value);
                this.updateInstallmentsDisplay();
                this.updateCalculations();
            });
        }

        // Slider dinámico para deudas mayores a $1M
        const dynamicSlider = document.getElementById('dynamic-installments-slider');
        if (dynamicSlider) {
            dynamicSlider.addEventListener('input', (e) => {
                this.installments = parseInt(e.target.value);
                this.updateDynamicInstallmentsDisplay();
                this.updateCalculations();
            });
        }

        // Selector de fecha del primer pago
        this.setupDateSelector();

        // Botones de opciones de pago para deudas mayores a $1M
        const paymentOptions = document.querySelectorAll('.payment-option');
        paymentOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const plan = e.currentTarget.dataset.plan;
                const minCuotas = parseInt(e.currentTarget.dataset.minCuotas);
                const maxCuotas = parseInt(e.currentTarget.dataset.maxCuotas);
                this.selectPaymentPlan(plan, minCuotas, maxCuotas);
            });
        });

        // Botón de confirmar acuerdo
        const confirmBtn = document.getElementById('confirm-agreement');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                // Validar fecha antes de enviar
                if (!this.validateDateBeforeSend()) {
                    return;
                }
                this.sendAgreement();
            });
        }
    }

    // Renderizar interfaz según el tipo de deuda
    renderInterface() {
        const totalDebt = this.debtData.capital + this.debtData.intereses + this.debtData.costos;
        const largeDateSelector = document.getElementById('large-debt-date-selector');
        
        if (totalDebt >= 1000000) {
            // Deuda mayor o igual a $1M - mostrar opciones de descuento
            document.getElementById('large-debt-options').style.display = 'block';
            document.getElementById('small-debt-options').style.display = 'none';
            // Mostrar selector de fecha para deudas mayores
            if (largeDateSelector) {
                largeDateSelector.style.display = 'block';
            }
        } else {
            // Deuda menor a $1M - mostrar slider de cuotas
            document.getElementById('large-debt-options').style.display = 'none';
            document.getElementById('small-debt-options').style.display = 'block';
            this.selectedPlan = 'custom';
            // Ocultar selector de fecha para deudas mayores
            if (largeDateSelector) {
                largeDateSelector.style.display = 'none';
            }
            // Actualizar cálculos y validar botón para deudas menores
            this.updateCalculations();
            this.validateAndEnableButton();
        }

        // Mostrar información de deuda
        this.displayDebtInfo();
        this.displayAdditionalInfo();
        
        // Actualizar información de fecha en el resumen
        this.updateDateInfo();
    }

    // Mostrar información de deuda
    displayDebtInfo() {
        document.getElementById('capital-display').textContent = this.formatCurrency(this.debtData.capital);
        document.getElementById('intereses-display').textContent = this.formatCurrency(this.debtData.intereses);
        document.getElementById('costos-display').textContent = this.formatCurrency(this.debtData.costos);
        
        const total = this.debtData.capital + this.debtData.intereses + this.debtData.costos;
        document.getElementById('total-display').textContent = this.formatCurrency(total);
    }

    // Mostrar información adicional
    displayAdditionalInfo() {
        document.getElementById('fecha-inicio-display').textContent = this.debtData.fechaInicio || '-';
        document.getElementById('dias-mora-display').textContent = this.debtData.diasMora ? `${this.debtData.diasMora} días` : '-';
        document.getElementById('cuota-anterior-display').textContent = this.debtData.cuotaAnterior ? this.formatCurrency(parseFloat(this.debtData.cuotaAnterior)) : '-';
    }

    // Seleccionar plan de pago
    selectPaymentPlan(plan, minCuotas, maxCuotas) {
        // Remover selección anterior
        document.querySelectorAll('.payment-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Seleccionar nueva opción
        const selectedOption = document.querySelector(`[data-plan="${plan}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }

        this.selectedPlan = plan;
        
        // Configurar slider dinámico
        this.setupDynamicSlider(plan, minCuotas, maxCuotas);
        this.updateCalculations();
        this.enableConfirmButton();
    }

    // Configurar slider dinámico
    setupDynamicSlider(plan, minCuotas, maxCuotas) {
        const dynamicSlider = document.getElementById('dynamic-installments-slider');
        const dynamicSliderContainer = document.getElementById('dynamic-slider');
        const sliderLabel = document.getElementById('slider-label');
        
        if (plan === 'contado') {
            // Contado: no mostrar slider
            dynamicSliderContainer.style.display = 'none';
            this.installments = 1;
        } else {
            // Mostrar slider con rango específico
            dynamicSliderContainer.style.display = 'block';
            dynamicSlider.min = minCuotas;
            dynamicSlider.max = maxCuotas;
            dynamicSlider.value = minCuotas;
            this.installments = minCuotas;
            
            // Actualizar label
            sliderLabel.textContent = `Cuotas (${minCuotas}-${maxCuotas}):`;
            
            // Actualizar display
            this.updateDynamicInstallmentsDisplay();
        }
    }

    // Actualizar display del slider dinámico
    updateDynamicInstallmentsDisplay() {
        const value = document.getElementById('dynamic-installments-value');
        if (value) {
            value.textContent = `${this.installments} ${this.installments === 1 ? 'cuota' : 'cuotas'}`;
        }
    }


    // Actualizar display del slider
    updateInstallmentsDisplay() {
        const value = document.getElementById('installments-value');
        if (value) {
            value.textContent = `${this.installments} ${this.installments === 1 ? 'cuota' : 'cuotas'}`;
        }
    }

    // Configurar selector de fecha
    setupDateSelector() {
        // Configurar ambos selectores (para deudas menores y mayores)
        this.setupSingleDateSelector('payment-day', 'payment-month', 'payment-year', 'first-payment-date');
        this.setupSingleDateSelector('payment-day-large', 'payment-month-large', 'payment-year-large', 'first-payment-date-large');
    }
    
    // Configurar un selector de fecha individual
    setupSingleDateSelector(dayId, monthId, yearId, hiddenInputId) {
        const daySelect = document.getElementById(dayId);
        const monthSelect = document.getElementById(monthId);
        const yearSelect = document.getElementById(yearId);
        const hiddenInput = document.getElementById(hiddenInputId);
        
        if (!daySelect || !monthSelect || !yearSelect) return;
        
        // Obtener fecha actual
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        
        // Llenar selector de años (hasta 5 años adelante)
        for (let year = currentYear; year <= currentYear + 5; year++) {
            const option = document.createElement('option');
            option.value = year.toString();
            option.textContent = year.toString();
            yearSelect.appendChild(option);
        }
        
        // Función para actualizar días según mes y año seleccionados
        const updateDays = () => {
            const selectedYear = parseInt(yearSelect.value);
            const selectedMonth = parseInt(monthSelect.value);
            
            if (!selectedYear || !selectedMonth) {
                daySelect.innerHTML = '<option value="">Día</option>';
                daySelect.value = '';
                return;
            }
            
            // Obtener días del mes
            const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
            
            // Guardar el valor actual del día ANTES de limpiar las opciones
            const currentDayValue = daySelect.value;
            const currentDayNum = currentDayValue ? parseInt(currentDayValue) : null;
            
            // Limpiar las opciones
            daySelect.innerHTML = '<option value="">Día</option>';
            
            // Determinar día mínimo (si es el mes/año actual, no permitir días pasados)
            let minDay = 1;
            if (selectedYear === currentYear && selectedMonth === currentMonth) {
                minDay = currentDay;
            }
            
            // Llenar los días disponibles
            for (let day = minDay; day <= daysInMonth; day++) {
                const option = document.createElement('option');
                const dayStr = day.toString().padStart(2, '0');
                option.value = dayStr;
                option.textContent = day.toString();
                daySelect.appendChild(option);
            }
            
            // Restaurar el día seleccionado si era válido
            if (currentDayNum && currentDayNum >= minDay && currentDayNum <= daysInMonth) {
                // Restaurar el valor anterior si sigue siendo válido
                const dayStrToRestore = currentDayNum.toString().padStart(2, '0');
                if (daySelect.querySelector(`option[value="${dayStrToRestore}"]`)) {
                    daySelect.value = dayStrToRestore;
                }
            } else {
                // Si no había día o no es válido, seleccionar el mínimo disponible
                if (daySelect.options.length > 1) {
                    daySelect.value = minDay.toString().padStart(2, '0');
                }
            }
        };
        
        // Actualizar días cuando cambie mes o año
        monthSelect.addEventListener('change', () => {
            const oldDayValue = daySelect.value;
            updateDays();
            // Si el día anterior era válido y sigue disponible, restaurarlo
            if (oldDayValue && daySelect.querySelector(`option[value="${oldDayValue}"]`)) {
                daySelect.value = oldDayValue;
            }
            this.updateDateValue();
        });
        
        yearSelect.addEventListener('change', () => {
            const oldDayValue = daySelect.value;
            updateDays();
            // Si el día anterior era válido y sigue disponible, restaurarlo
            if (oldDayValue && daySelect.querySelector(`option[value="${oldDayValue}"]`)) {
                daySelect.value = oldDayValue;
            }
            this.updateDateValue();
        });
        
        // Actualizar fecha cuando cambie el día
        daySelect.addEventListener('change', (e) => {
            // Prevenir propagación de eventos
            e.stopPropagation();
            
            // Obtener el valor seleccionado directamente del evento
            const selectedValue = e.target.value;
            
            // Si hay un valor seleccionado, actualizar
            if (selectedValue) {
                // Asegurarse de que el valor se establece correctamente
                daySelect.value = selectedValue;
                
                // Actualizar el valor de la fecha
                this.updateDateValue();
                
                // Verificar nuevamente que el valor se mantuvo (defensa contra reseteos)
                if (daySelect.value !== selectedValue && selectedValue) {
                    setTimeout(() => {
                        daySelect.value = selectedValue;
                        this.updateDateValue();
                    }, 10);
                }
            }
        }, false);
        
        // Establecer valores por defecto (hoy)
        yearSelect.value = currentYear.toString();
        monthSelect.value = currentMonth.toString().padStart(2, '0');
        // Actualizar días disponibles
        updateDays();
        // updateDays() ya debería haber seleccionado el día actual, pero nos aseguramos
        if (!daySelect.value) {
            daySelect.value = currentDay.toString().padStart(2, '0');
        }
        
        // Inicializar fecha
        this.updateDateValue();
        this.updateDateInfo();
    }
    
    // Sincronizar valores entre ambos selectores
    syncDateSelectors(sourceId, targetId) {
        // Solo sincronizar si los IDs son diferentes
        if (sourceId === targetId) return;
        
        const sourceDay = document.getElementById(sourceId === 'payment-day' ? 'payment-day' : 'payment-day-large');
        const sourceMonth = document.getElementById(sourceId === 'payment-day' ? 'payment-month' : 'payment-month-large');
        const sourceYear = document.getElementById(sourceId === 'payment-day' ? 'payment-year' : 'payment-year-large');
        
        const targetDay = document.getElementById(targetId === 'payment-day' ? 'payment-day' : 'payment-day-large');
        const targetMonth = document.getElementById(targetId === 'payment-day' ? 'payment-month' : 'payment-month-large');
        const targetYear = document.getElementById(targetId === 'payment-day' ? 'payment-year' : 'payment-year-large');
        
        if (!sourceDay || !sourceMonth || !sourceYear || !targetDay || !targetMonth || !targetYear) return;
        
        // Solo sincronizar si el selector fuente tiene valores
        if (!sourceDay.value || !sourceMonth.value || !sourceYear.value) return;
        
        // Sincronizar año y mes primero
        if (targetYear.value !== sourceYear.value) {
            targetYear.value = sourceYear.value;
        }
        if (targetMonth.value !== sourceMonth.value) {
            targetMonth.value = sourceMonth.value;
            // Actualizar días disponibles cuando cambia el mes
            const year = parseInt(targetYear.value);
            const month = parseInt(targetMonth.value);
            if (year && month) {
                this.updateDaysForSelector(targetDay, targetMonth, targetYear);
            }
        } else if (targetYear.value !== sourceYear.value) {
            // Si solo cambió el año, actualizar días también
            const year = parseInt(targetYear.value);
            const month = parseInt(targetMonth.value);
            if (year && month) {
                this.updateDaysForSelector(targetDay, targetMonth, targetYear);
            }
        }
        
        // Sincronizar día si está disponible
        if (targetDay.querySelector(`option[value="${sourceDay.value}"]`)) {
            targetDay.value = sourceDay.value;
        }
    }
    
    // Actualizar días disponibles para un selector
    updateDaysForSelector(daySelect, monthSelect, yearSelect) {
        const year = parseInt(yearSelect.value);
        const month = parseInt(monthSelect.value);
        
        if (!year || !month) {
            daySelect.innerHTML = '<option value="">Día</option>';
            daySelect.value = '';
            return;
        }
        
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        
        const daysInMonth = new Date(year, month, 0).getDate();
        const selectedDayStr = daySelect.value;
        const selectedDay = selectedDayStr ? parseInt(selectedDayStr) : null;
        
        daySelect.innerHTML = '<option value="">Día</option>';
        
        let minDay = 1;
        if (year === currentYear && month === currentMonth) {
            minDay = currentDay;
        }
        
        for (let day = minDay; day <= daysInMonth; day++) {
            const option = document.createElement('option');
            const dayStr = day.toString().padStart(2, '0');
            option.value = dayStr;
            option.textContent = day.toString();
            daySelect.appendChild(option);
        }
        
        // Restaurar día seleccionado si está disponible, o seleccionar el mínimo
        if (selectedDay && selectedDay >= minDay && selectedDay <= daysInMonth) {
            const dayStrToRestore = selectedDay.toString().padStart(2, '0');
            if (daySelect.querySelector(`option[value="${dayStrToRestore}"]`)) {
                daySelect.value = dayStrToRestore;
            } else {
                daySelect.value = minDay.toString().padStart(2, '0');
            }
        } else {
            daySelect.value = minDay.toString().padStart(2, '0');
        }
    }
    
    // Actualizar valor de fecha oculto
    updateDateValue() {
        // Intentar obtener valores del selector para deudas menores primero
        let daySelect = document.getElementById('payment-day');
        let monthSelect = document.getElementById('payment-month');
        let yearSelect = document.getElementById('payment-year');
        let hiddenInput = document.getElementById('first-payment-date');
        
        // Si no existe, usar el selector para deudas mayores
        if (!daySelect || !monthSelect || !yearSelect) {
            daySelect = document.getElementById('payment-day-large');
            monthSelect = document.getElementById('payment-month-large');
            yearSelect = document.getElementById('payment-year-large');
            hiddenInput = document.getElementById('first-payment-date-large');
        }
        
        if (!daySelect || !monthSelect || !yearSelect) return;
        
        const day = daySelect.value;
        const month = monthSelect.value;
        const year = yearSelect.value;
        
        if (day && month && year) {
            const dateValue = `${year}-${month}-${day}`;
            this.firstPaymentDate = dateValue;
            
            // Actualizar ambos inputs ocultos si existen
            const hiddenInput1 = document.getElementById('first-payment-date');
            const hiddenInput2 = document.getElementById('first-payment-date-large');
            if (hiddenInput1) hiddenInput1.value = dateValue;
            if (hiddenInput2) hiddenInput2.value = dateValue;
            
            this.validateAndEnableButton();
            this.updateDateInfo();
        } else {
            const hiddenInput1 = document.getElementById('first-payment-date');
            const hiddenInput2 = document.getElementById('first-payment-date-large');
            if (hiddenInput1) hiddenInput1.value = '';
            if (hiddenInput2) hiddenInput2.value = '';
            this.firstPaymentDate = null;
            this.validateAndEnableButton();
        }
    }


    // Actualizar cálculos
    updateCalculations() {
        if (!this.selectedPlan) return;

        let capitalToPay = this.debtData.capital;
        let discountAmount = 0;
        let installments = this.installments;

        // Aplicar descuentos según el plan
        if (this.selectedPlan !== 'custom') {
            const discounts = {
                'contado': { discount: 0.30 },
                '6meses': { discount: 0.20 },
                '1año': { discount: 0.10 },
                '2años': { discount: 0.00 }
            };

            const planData = discounts[this.selectedPlan];
            discountAmount = capitalToPay * planData.discount;
            capitalToPay = capitalToPay - discountAmount;
            // installments ya está definido por el slider dinámico
        }

        // Calcular valores
        const installmentValue = installments > 0 ? capitalToPay / installments : capitalToPay;
        const totalCondoned = this.debtData.intereses + this.debtData.costos;
        const totalSaved = discountAmount + totalCondoned;

        // Actualizar display
        this.updateResultsDisplay({
            capitalToPay,
            discountAmount,
            interesesCondonados: this.debtData.intereses,
            costosCondonados: this.debtData.costos,
            totalSaved,
            installmentValue,
            installments
        });
    }

    // Actualizar display de resultados
    updateResultsDisplay(results) {
        document.getElementById('capital-pagar').textContent = this.formatCurrency(results.capitalToPay);
        document.getElementById('descuento-capital').textContent = this.formatCurrency(results.discountAmount);
        document.getElementById('intereses-condonados').textContent = this.formatCurrency(results.interesesCondonados);
        document.getElementById('costos-condonados').textContent = this.formatCurrency(results.costosCondonados);
        document.getElementById('total-ahorro').textContent = this.formatCurrency(results.totalSaved);
        document.getElementById('valor-cuota').textContent = this.formatCurrency(results.installmentValue);
        document.getElementById('numero-cuotas').textContent = results.installments.toString();
        
        // Actualizar información de fecha
        this.updateDateInfo();
    }
    
    // Actualizar información de fecha en el resumen
    updateDateInfo() {
        const fechaPrimerPagoEl = document.getElementById('fecha-primer-pago');
        const diaPagoMensualEl = document.getElementById('dia-pago-mensual');
        
        if (!this.firstPaymentDate) {
            if (fechaPrimerPagoEl) fechaPrimerPagoEl.textContent = '-';
            if (diaPagoMensualEl) diaPagoMensualEl.textContent = '-';
            return;
        }
        
        try {
            // Formatear fecha del primer pago
            const fecha = new Date(this.firstPaymentDate + 'T00:00:00');
            if (fechaPrimerPagoEl) {
                fechaPrimerPagoEl.textContent = this.formatDate(fecha);
            }
            
            // Extraer día para mostrar "los X de cada mes"
            const day = fecha.getDate();
            if (diaPagoMensualEl) {
                diaPagoMensualEl.textContent = `Los días ${day} de cada mes`;
            }
        } catch (error) {
            console.error('Error formateando fecha:', error);
            if (fechaPrimerPagoEl) fechaPrimerPagoEl.textContent = '-';
            if (diaPagoMensualEl) diaPagoMensualEl.textContent = '-';
        }
    }
    
    // Formatear fecha en español
    formatDate(date) {
        const meses = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        
        const dia = date.getDate();
        const mes = meses[date.getMonth()];
        const año = date.getFullYear();
        
        return `${dia} de ${mes} de ${año}`;
    }

    // Habilitar botón de confirmar
    enableConfirmButton() {
        this.validateAndEnableButton();
    }

    // Validar y habilitar botón de confirmar
    validateAndEnableButton() {
        const confirmBtn = document.getElementById('confirm-agreement');
        const dateError = document.getElementById('date-error') || document.getElementById('date-error-large');
        
        if (!confirmBtn) return;
        
        // Validar que hay un plan seleccionado
        const hasPlan = this.selectedPlan !== null;
        
        // Intentar obtener valores del selector para deudas menores primero
        let daySelect = document.getElementById('payment-day');
        let monthSelect = document.getElementById('payment-month');
        let yearSelect = document.getElementById('payment-year');
        let hiddenInput = document.getElementById('first-payment-date');
        
        // Si no existe, usar el selector para deudas mayores
        if (!daySelect || !monthSelect || !yearSelect) {
            daySelect = document.getElementById('payment-day-large');
            monthSelect = document.getElementById('payment-month-large');
            yearSelect = document.getElementById('payment-year-large');
            hiddenInput = document.getElementById('first-payment-date-large');
        }
        
        // Validar que todos los selectores de fecha tienen valor
        const hasDay = daySelect && daySelect.value !== '';
        const hasMonth = monthSelect && monthSelect.value !== '';
        const hasYear = yearSelect && yearSelect.value !== '';
        const hasDate = hasDay && hasMonth && hasYear;
        
        if (hasPlan && hasDate) {
            // Validar que la fecha no sea en el pasado
            if (hiddenInput && hiddenInput.value) {
                const selectedDate = new Date(hiddenInput.value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (selectedDate >= today) {
                    this.firstPaymentDate = hiddenInput.value;
                    confirmBtn.disabled = false;
                    if (dateError) {
                        dateError.style.display = 'none';
                    }
                } else {
                    confirmBtn.disabled = true;
                    if (dateError) {
                        dateError.textContent = 'La fecha del primer pago no puede ser en el pasado';
                        dateError.style.display = 'block';
                    }
                    return;
                }
            } else {
                confirmBtn.disabled = false;
                if (dateError) {
                    dateError.style.display = 'none';
                }
            }
        } else {
            confirmBtn.disabled = true;
            if (!hasDate && dateError && hasPlan) {
                dateError.textContent = 'Por favor selecciona la fecha del primer pago (día, mes y año)';
                dateError.style.display = 'block';
            } else if (dateError) {
                dateError.style.display = 'none';
            }
        }
    }

    // Validar fecha antes de enviar
    validateDateBeforeSend() {
        // Intentar obtener valores del selector para deudas menores primero
        let daySelect = document.getElementById('payment-day');
        let monthSelect = document.getElementById('payment-month');
        let yearSelect = document.getElementById('payment-year');
        let hiddenInput = document.getElementById('first-payment-date');
        let dateError = document.getElementById('date-error');
        
        // Si no existe, usar el selector para deudas mayores
        if (!daySelect || !monthSelect || !yearSelect) {
            daySelect = document.getElementById('payment-day-large');
            monthSelect = document.getElementById('payment-month-large');
            yearSelect = document.getElementById('payment-year-large');
            hiddenInput = document.getElementById('first-payment-date-large');
            dateError = document.getElementById('date-error-large');
        }
        
        // Validar que todos los selectores tienen valor
        const hasDay = daySelect && daySelect.value !== '';
        const hasMonth = monthSelect && monthSelect.value !== '';
        const hasYear = yearSelect && yearSelect.value !== '';
        
        if (!hasDay || !hasMonth || !hasYear || !hiddenInput || !hiddenInput.value || hiddenInput.value.trim() === '') {
            if (dateError) {
                dateError.textContent = 'Por favor selecciona la fecha del primer pago (día, mes y año)';
                dateError.style.display = 'block';
            }
            return false;
        }
        
        // Validar que la fecha no sea en el pasado
        const selectedDate = new Date(hiddenInput.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            if (dateError) {
                dateError.textContent = 'La fecha del primer pago no puede ser en el pasado';
                dateError.style.display = 'block';
            }
            return false;
        }
        
        this.firstPaymentDate = hiddenInput.value;
        if (dateError) {
            dateError.style.display = 'none';
        }
        return true;
    }

    // Enviar acuerdo vía webhook
    async sendAgreement() {
        const confirmBtn = document.getElementById('confirm-agreement');
        const statusDiv = document.getElementById('webhook-status');
        
        // Validar que el webhook URL esté configurado
        if (!this.webhookUrl || this.webhookUrl.includes('tu-webhook-n8n.com')) {
            statusDiv.style.display = 'block';
            statusDiv.querySelector('.status-text').textContent = 'Error: Webhook no configurado. Configura WEBHOOK_URL en Vercel.';
            statusDiv.querySelector('.status-icon').textContent = '❌';
            return;
        }
        
        // Deshabilitar botón y mostrar loading
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="btn-text">Enviando...</span><span class="btn-icon">⏳</span>';

        try {
            // Preparar payload
            const payload = this.prepareWebhookPayload();
            
            // Enviar webhook
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Mostrar éxito
                statusDiv.style.display = 'block';
                statusDiv.querySelector('.status-text').textContent = 'Acuerdo enviado exitosamente';
                statusDiv.querySelector('.status-icon').textContent = '✅';
                
                // Resetear botón
                confirmBtn.innerHTML = '<span class="btn-text">Acuerdo Confirmado</span><span class="btn-icon">✅</span>';
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            console.error('Error enviando webhook:', error);
            
            // Mostrar error
            statusDiv.style.display = 'block';
            statusDiv.querySelector('.status-text').textContent = `Error: ${error.message}`;
            statusDiv.querySelector('.status-icon').textContent = '❌';
            
            // Resetear botón
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<span class="btn-text">Reintentar Envío</span><span class="btn-icon">🔄</span>';
        }
    }

    // Preparar payload para webhook
    prepareWebhookPayload() {
        const totalDebt = this.debtData.capital + this.debtData.intereses + this.debtData.costos;
        
        let capitalToPay = this.debtData.capital;
        let discountAmount = 0;
        let installments = this.installments;
        let planName = this.selectedPlan;

        // Aplicar descuentos según el plan
        if (this.selectedPlan !== 'custom') {
            const discounts = {
                'contado': { discount: 0.30, name: 'Contado' },
                '6meses': { discount: 0.20, name: '6 Meses' },
                '1año': { discount: 0.10, name: '1 Año' },
                '2años': { discount: 0.00, name: '2 Años' }
            };

            const planData = discounts[this.selectedPlan];
            discountAmount = capitalToPay * planData.discount;
            capitalToPay = capitalToPay - discountAmount;
            planName = `${planData.name} (${installments} cuotas)`;
        }

        const installmentValue = installments > 0 ? capitalToPay / installments : capitalToPay;
        const totalCondoned = this.debtData.intereses + this.debtData.costos;
        const totalSaved = discountAmount + totalCondoned;

        return {
            capitalOriginal: this.debtData.capital,
            interesesCondonados: this.debtData.intereses,
            costosCondonados: this.debtData.costos,
            totalOriginal: totalDebt,
            capitalAPagar: capitalToPay,
            descuentoCapital: discountAmount,
            totalCondonado: totalCondoned,
            totalAhorro: totalSaved,
            planSeleccionado: planName,
            numeroCuotas: installments,
            valorCuota: installmentValue,
            fechaAcuerdo: new Date().toISOString(),
            datosInformativos: {
                fechaInicioMora: this.debtData.fechaInicio,
                diasMora: this.debtData.diasMora,
                cuotaAnterior: this.debtData.cuotaAnterior
            },
            uuidDeudor: this.debtData.uuid,
            urlOrigen: window.location.href,
            fechaPrimerPago: this.firstPaymentDate,
            timestamp: Date.now()
        };
    }

    // Formatear moneda
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}

// Inicializar calculadora cuando se carga la página
document.addEventListener('DOMContentLoaded', async () => {
    window.calculator = new PaymentAgreementCalculator();
    // El init() es async y se ejecuta automáticamente en el constructor
});

// Función auxiliar para debugging (remover en producción)
window.debugCalculator = function() {
    console.log('Calculator Debug Info:');
    console.log('- Debt Data:', window.calculator?.debtData);
    console.log('- Selected Plan:', window.calculator?.selectedPlan);
    console.log('- Installments:', window.calculator?.installments);
    console.log('- Webhook URL:', window.calculator?.webhookUrl);
};
