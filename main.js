// Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const defaultConfig = {
      hub_title: 'Meu Workspace'
    };

    let config = { ...defaultConfig };

    async function onConfigChange(newConfig) {
      document.getElementById('hubTitle').textContent = newConfig.hub_title || defaultConfig.hub_title;
    }

    if (window.elementSdk) {
      window.elementSdk.init({
        defaultConfig,
        onConfigChange,
        mapToCapabilities: (cfg) => ({
          recolorables: [],
          borderables: [],
          fontEditable: undefined,
          fontSizeable: undefined
        }),
        mapToEditPanelValues: (cfg) => new Map([
          ['hub_title', cfg.hub_title || defaultConfig.hub_title]
        ])
      });
      config = window.elementSdk.config;
    }

    onConfigChange(config);

    // Set current date in preview
    const today = new Date();
    const dateString = today.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    document.getElementById('previewDateValue').textContent = dateString;

    // Navigation
    function showHub() {
      document.getElementById('hubView').style.display = 'flex';
      document.getElementById('hubView').classList.add('active');
      document.querySelectorAll('.module-view').forEach(view => {
        view.classList.remove('active');
      });
    }

    function showModule(moduleId) {
      document.getElementById('hubView').style.display = 'none';
      
      // Try both CamelCase and lowercase versions for compatibility
      let moduleView = document.getElementById(moduleId + 'View');
      if (!moduleView) {
        moduleView = document.getElementById(moduleId + 'view');
      }
      
      if (moduleView) {
        moduleView.classList.add('active');
      } else {
        console.error('Module view not found for:', moduleId);
      }
    }

    document.querySelectorAll('.module-tile').forEach(tile => {
      tile.addEventListener('click', function() {
        const module = this.dataset.module;
        showModule(module);
      });
    });

    // ESC key to go back to hub
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        showHub();
      }
    });

    // Search and Filter functionality
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    const modulesGrid = document.getElementById('modulesGrid');
    const noResults = document.getElementById('noResults');
    const activeFiltersContainer = document.getElementById('activeFilters');

    function applyFilters() {
      const searchTerm = searchInput.value.toLowerCase().trim();
      const category = categoryFilter.value;
      const sort = sortFilter.value;

      let modules = Array.from(document.querySelectorAll('.module-tile'));
      let visibleCount = 0;

      modules.forEach(module => {
        const name = module.dataset.name.toLowerCase();
        const moduleCategory = module.dataset.category;
        
        const matchesSearch = name.includes(searchTerm);
        const matchesCategory = category === 'all' || moduleCategory === category;

        if (matchesSearch && matchesCategory) {
          module.style.display = 'flex';
          visibleCount++;
        } else {
          module.style.display = 'none';
        }
      });

      const visibleModules = modules.filter(m => m.style.display !== 'none');
      
      if (sort === 'az') {
        visibleModules.sort((a, b) => a.dataset.name.localeCompare(b.dataset.name));
      } else if (sort === 'za') {
        visibleModules.sort((a, b) => b.dataset.name.localeCompare(a.dataset.name));
      }

      visibleModules.forEach(module => modulesGrid.appendChild(module));

      if (visibleCount === 0) {
        noResults.classList.add('show');
        modulesGrid.style.display = 'none';
      } else {
        noResults.classList.remove('show');
        modulesGrid.style.display = 'grid';
      }

      updateActiveFilters(searchTerm, category, sort);
    }

    function updateActiveFilters(searchTerm, category, sort) {
      activeFiltersContainer.innerHTML = '';
      
      if (searchTerm) {
        const tag = document.createElement('div');
        tag.className = 'filter-tag';
        tag.innerHTML = `
          Busca: "${searchTerm}"
          <span class="filter-tag-close" onclick="clearSearch()">×</span>
        `;
        activeFiltersContainer.appendChild(tag);
      }

      if (category !== 'all') {
        const categoryNames = {
          'gerador': 'Geradores',
          'conversor': 'Conversores',
          'utilidade': 'Utilidades'
        };
        const tag = document.createElement('div');
        tag.className = 'filter-tag';
        tag.innerHTML = `
          Categoria: ${categoryNames[category]}
          <span class="filter-tag-close" onclick="clearCategory()">×</span>
        `;
        activeFiltersContainer.appendChild(tag);
      }

      if (sort !== 'default') {
        const sortNames = {
          'az': 'A-Z',
          'za': 'Z-A'
        };
        const tag = document.createElement('div');
        tag.className = 'filter-tag';
        tag.innerHTML = `
          Ordem: ${sortNames[sort]}
          <span class="filter-tag-close" onclick="clearSort()">×</span>
        `;
        activeFiltersContainer.appendChild(tag);
      }
    }

    function clearSearch() {
      searchInput.value = '';
      applyFilters();
    }

    function clearCategory() {
      categoryFilter.value = 'all';
      applyFilters();
    }

    function clearSort() {
      sortFilter.value = 'default';
      applyFilters();
    }

    searchInput.addEventListener('input', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
    sortFilter.addEventListener('change', applyFilters);

    window.clearSearch = clearSearch;
    window.clearCategory = clearCategory;
    window.clearSort = clearSort;

    // Gerador de Orçamentos
    let logoDataUrl = null;

    // Função para extrair cor dominante da imagem
    function extractDominantColor(imgDataUrl) {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            const colorMap = {};
            let maxCount = 0;
            let dominantColor = '#3b82f6'; // cor padrão
            
            // Amostra pixels a cada 4 para performance
            for (let i = 0; i < data.length; i += 16) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];
              
              // Ignora pixels muito transparentes
              if (a < 128) continue;
              
              // Ignora cores muito claras (branco/cinza claro) e muito escuras
              const brightness = (r + g + b) / 3;
              if (brightness > 240 || brightness < 20) continue;
              
              // Converte para hex
              const hex = '#' + [r, g, b].map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
              }).join('').toUpperCase();
              
              colorMap[hex] = (colorMap[hex] || 0) + 1;
              
              if (colorMap[hex] > maxCount) {
                maxCount = colorMap[hex];
                dominantColor = hex;
              }
            }
            
            resolve(dominantColor);
          } catch (e) {
            console.log('Erro ao extrair cor, usando cor padrão');
            resolve('#3b82f6');
          }
        };
        img.onerror = function() {
          console.log('Erro ao carregar imagem');
          resolve('#3b82f6');
        };
        img.src = imgDataUrl;
      });
    }

    // Logo upload
    document.getElementById('logoInput').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async function(event) {
          logoDataUrl = event.target.result;
          document.getElementById('logoPreview').src = logoDataUrl;
          document.getElementById('logoPreview').classList.add('show');
          document.getElementById('logoPlaceholder').classList.add('hide');
          
          document.getElementById('previewLogoImg').src = logoDataUrl;
          document.getElementById('previewLogoImg').style.display = 'block';
          document.getElementById('previewLogoPlaceholder').style.display = 'none';
          
          // Extrai e aplica a cor dominante
          const dominantColor = await extractDominantColor(logoDataUrl);
          document.getElementById('accentColor').value = dominantColor;
          document.getElementById('accentColorText').value = dominantColor;
          updateAccentColor(dominantColor);
        };
        reader.readAsDataURL(file);
      }
    });

    // Color picker sync
    const accentColor = document.getElementById('accentColor');
    const accentColorText = document.getElementById('accentColorText');

    accentColor.addEventListener('input', function() {
      accentColorText.value = this.value;
      updateAccentColor(this.value);
    });

    accentColorText.addEventListener('input', function() {
      if (/^#[0-9A-F]{6}$/i.test(this.value)) {
        accentColor.value = this.value;
        updateAccentColor(this.value);
      }
    });

    function updateAccentColor(color) {
      document.documentElement.style.setProperty('--accent-color', color);
    }

    // Update preview in real-time
    document.getElementById('empresaNome').addEventListener('input', function() {
      document.getElementById('previewEmpresaNome').textContent = this.value || 'Nome da Empresa';
    });

    document.getElementById('clienteNome').addEventListener('input', function() {
      document.getElementById('previewClienteNome').textContent = this.value || 'Nome do Cliente';
    });

    // Payment method handler
    document.getElementById('paymentMethod').addEventListener('change', function() {
      document.getElementById('pixDetails').classList.remove('show');
      document.getElementById('transferenciaDetails').classList.remove('show');
      
      if (this.value === 'pix') {
        document.getElementById('pixDetails').classList.add('show');
      } else if (this.value === 'transferencia') {
        document.getElementById('transferenciaDetails').classList.add('show');
      }
      
      updatePreviewPayment();
    });

    // Payment inputs listeners
    ['pixType', 'pixKey', 'pixName', 'bankName', 'accountName', 'agency', 'account'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updatePreviewPayment);
      }
    });

    function updatePreviewPayment() {
      const method = document.getElementById('paymentMethod').value;
      const section = document.getElementById('previewPaymentSection');
      const info = document.getElementById('previewPaymentInfo');
      
      if (!method) {
        section.style.display = 'none';
        return;
      }
      
      section.style.display = 'block';
      info.innerHTML = '';
      
      if (method === 'pix') {
        const pixTypeLabels = {
          'cpf': 'CPF',
          'cnpj': 'CNPJ',
          'email': 'E-mail',
          'telefone': 'Telefone',
          'aleatoria': 'Chave Aleatória'
        };
        
        const pixType = pixTypeLabels[document.getElementById('pixType').value];
        const pixKey = document.getElementById('pixKey').value || '-';
        const pixName = document.getElementById('pixName').value || '-';
        
        info.innerHTML = `
          <div class="preview-payment-item">
            <div class="preview-payment-item-label">Método</div>
            <div class="preview-payment-item-value">PIX</div>
          </div>
          <div class="preview-payment-item">
            <div class="preview-payment-item-label">Tipo de Chave</div>
            <div class="preview-payment-item-value">${pixType}</div>
          </div>
          <div class="preview-payment-item">
            <div class="preview-payment-item-label">Chave PIX</div>
            <div class="preview-payment-item-value">${pixKey}</div>
          </div>
          <div class="preview-payment-item">
            <div class="preview-payment-item-label">Favorecido</div>
            <div class="preview-payment-item-value">${pixName}</div>
          </div>
        `;
      } else if (method === 'transferencia') {
        const bankName = document.getElementById('bankName').value || '-';
        const accountName = document.getElementById('accountName').value || '-';
        const agency = document.getElementById('agency').value || '-';
        const account = document.getElementById('account').value || '-';
        
        info.innerHTML = `
          <div class="preview-payment-item">
            <div class="preview-payment-item-label">Banco</div>
            <div class="preview-payment-item-value">${bankName}</div>
          </div>
          <div class="preview-payment-item">
            <div class="preview-payment-item-label">Titular</div>
            <div class="preview-payment-item-value">${accountName}</div>
          </div>
          <div class="preview-payment-item">
            <div class="preview-payment-item-label">Agência</div>
            <div class="preview-payment-item-value">${agency}</div>
          </div>
          <div class="preview-payment-item">
            <div class="preview-payment-item-label">Conta</div>
            <div class="preview-payment-item-value">${account}</div>
          </div>
        `;
      } else if (method === 'dinheiro') {
        info.innerHTML = `
          <div class="preview-payment-item">
            <div class="preview-payment-item-label">Método</div>
            <div class="preview-payment-item-value">Dinheiro</div>
          </div>
        `;
      }
    }

    // Items management
    function addItem() {
      const container = document.getElementById('itemsContainer');
      const itemRow = document.createElement('div');
      itemRow.className = 'item-row';
      itemRow.innerHTML = `
        <div class="form-group">
          <input type="text" class="form-input item-desc" placeholder="Ex: Sala">
        </div>
        <div class="form-group">
          <input type="number" class="form-input item-price" value="0" min="0" step="0.01">
        </div>
        <div class="item-controls">
          <label class="checkbox-label">
            <input type="checkbox" class="checkbox-input item-brinde">
            🎁 Brinde
          </label>
        </div>
        <button type="button" class="remove-item-btn" onclick="removeItem(this)">×</button>
      `;
      container.appendChild(itemRow);
      updateRemoveButtons();
      updatePreviewItems();
    }

    function removeItem(btn) {
      btn.closest('.item-row').remove();
      updateRemoveButtons();
      updatePreviewItems();
    }

    function updateRemoveButtons() {
      const rows = document.querySelectorAll('.item-row');
      rows.forEach((row, index) => {
        const btn = row.querySelector('.remove-item-btn');
        btn.disabled = rows.length === 1;
      });
    }

    document.getElementById('itemsContainer').addEventListener('input', updatePreviewItems);
    document.getElementById('itemsContainer').addEventListener('change', updatePreviewItems);

    function updatePreviewItems() {
      const rows = document.querySelectorAll('.item-row');
      const tbody = document.getElementById('previewItemsBody');
      tbody.innerHTML = '';
      
      let total = 0;
      
      if (rows.length === 0 || !Array.from(rows).some(row => row.querySelector('.item-desc').value)) {
        tbody.innerHTML = `
          <tr>
            <td colspan="2" style="text-align: center; color: #94a3b8; padding: 32px;">
              Adicione itens ao orçamento
            </td>
          </tr>
        `;
      } else {
        rows.forEach(row => {
          const desc = row.querySelector('.item-desc').value;
          const price = parseFloat(row.querySelector('.item-price').value) || 0;
          const isBrinde = row.querySelector('.item-brinde').checked;
          
          if (desc) {
            const tr = document.createElement('tr');
            
            if (isBrinde) {
              tr.innerHTML = `
                <td>
                  ${desc}
                  <span class="preview-item-brinde">BRINDE</span>
                </td>
                <td style="text-align: right; color: #10b981; font-weight: 600;">R$ 0,00</td>
              `;
            } else {
              tr.innerHTML = `
                <td>${desc}</td>
                <td style="text-align: right;">R$ ${price.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              `;
              total += price;
            }
            
            tbody.appendChild(tr);
          }
        });
      }
      
      document.getElementById('previewTotal').textContent = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }

    // Download as PNG
    async function downloadOrcamento() {
      const preview = document.getElementById('orcamentoPreview');
      const btn = event.target;
      
      btn.disabled = true;
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 0.8s linear infinite;">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        Gerando...
      `;
      
      try {
        const canvas = await html2canvas(preview, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true
        });
        
        canvas.toBlob(function(blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const clienteName = document.getElementById('clienteNome').value || 'cliente';
          a.download = `orcamento_${clienteName.replace(/\s+/g, '_')}_${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          
          btn.disabled = false;
          btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Baixar Orçamento (PNG)
          `;
        });
      } catch (error) {
        console.error('Erro ao gerar imagem:', error);
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Baixar Orçamento (PNG)
        `;
      }
    }

    // PDF to Word Converter
    const uploadArea = document.getElementById('uploadArea');
    const pdfFileInput = document.getElementById('pdfFile');
    const selectedFile = document.getElementById('selectedFile');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const convertBtn = document.getElementById('convertBtn');
    const conversionProgress = document.getElementById('conversionProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const conversionStatus = document.getElementById('conversionStatus');

    let currentFile = null;

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type === 'application/pdf') {
        handleFileSelect(files[0]);
      }
    });

    pdfFileInput.addEventListener('change', function() {
      if (this.files.length > 0) {
        handleFileSelect(this.files[0]);
      }
    });

    function handleFileSelect(file) {
      if (file.type !== 'application/pdf') {
        showStatus('Por favor, selecione um arquivo PDF válido', true);
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        showStatus('Arquivo muito grande. O tamanho máximo é 50MB', true);
        return;
      }

      currentFile = file;
      fileName.textContent = file.name;
      fileSize.textContent = formatFileSize(file.size);
      selectedFile.classList.add('show');
      convertBtn.classList.add('show');
      conversionStatus.classList.remove('show');
      conversionProgress.classList.remove('show');
    }

    function removeFile() {
      currentFile = null;
      pdfFileInput.value = '';
      selectedFile.classList.remove('show');
      convertBtn.classList.remove('show');
      conversionStatus.classList.remove('show');
      conversionProgress.classList.remove('show');
    }

    function formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    function updateProgress(percent, text) {
      progressBar.style.width = percent + '%';
      progressText.textContent = text;
    }

    function showStatus(message, isError = false) {
      conversionStatus.textContent = message;
      conversionStatus.classList.add('show');
      if (isError) {
        conversionStatus.classList.add('error');
      } else {
        conversionStatus.classList.remove('error');
      }
    }

    async function convertPDF() {
      if (!currentFile) return;

      convertBtn.disabled = true;
      conversionProgress.classList.add('show');
      conversionStatus.classList.remove('show');
      
      try {
        updateProgress(10, 'Carregando PDF...');

        const arrayBuffer = await currentFile.arrayBuffer();
        updateProgress(25, 'Analisando documento...');

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        
        let fullText = '';
        
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          updateProgress(25 + (pageNum / numPages) * 50, `Extraindo página ${pageNum} de ${numPages}...`);
          
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .map(item => item.str)
            .join(' ');
          
          fullText += pageText + '\n\n';
        }

        updateProgress(80, 'Criando documento Word...');

        const docContent = `
          <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
            <w:body>
              ${fullText.split('\n\n').map(para => 
                para.trim() ? `<w:p><w:r><w:t>${escapeXml(para)}</w:t></w:r></w:p>` : ''
              ).join('')}
            </w:body>
          </w:document>
        `;

        updateProgress(90, 'Finalizando...');

        if (typeof PizZip === 'undefined') {
          throw new Error('Biblioteca PizZip não carregada. Por favor, recarregue a página.');
        }

        const zip = new PizZip();
        zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
        
        const relsFolder = zip.folder('_rels');
        relsFolder.file('.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
        
        const wordFolder = zip.folder('word');
        wordFolder.file('document.xml', docContent);

        const wordRelsFolder = wordFolder.folder('_rels');
        wordRelsFolder.file('document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');

        const blob = zip.generate({ 
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        updateProgress(100, 'Concluído!');

        const outputFileName = currentFile.name.replace('.pdf', '.docx');
        saveAs(blob, outputFileName);

        showStatus(`✓ Arquivo "${outputFileName}" convertido com sucesso!`);
        
        setTimeout(() => {
          removeFile();
        }, 3000);

      } catch (error) {
        console.error('Erro na conversão:', error);
        showStatus('Erro ao converter o arquivo. Por favor, tente novamente.', true);
      } finally {
        convertBtn.disabled = false;
        conversionProgress.classList.remove('show');
      }
    }

    function escapeXml(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    // EPUB Converter
    let epubCurrentFile = null;

    document.getElementById('docFile').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        handleEpubFileSelect(file);
      }
    });

    // Drag and drop for EPUB
    const epubUploadArea = document.getElementById('epubUploadArea');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      epubUploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      epubUploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      epubUploadArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
      epubUploadArea.classList.add('dragover');
    }

    function unhighlight(e) {
      epubUploadArea.classList.remove('dragover');
    }

    epubUploadArea.addEventListener('drop', handleEpubDrop, false);

    function handleEpubDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        handleEpubFileSelect(files[0]);
      }
    }

    function handleEpubFileSelect(file) {
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/html'];
      const validExtensions = ['.pdf', '.doc', '.docx', '.txt', '.html'];
      
      if (!validTypes.includes(file.type) && !validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
        showEpubStatus('Por favor, selecione um arquivo válido (PDF, DOC, DOCX, TXT ou HTML)', true);
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        showEpubStatus('Arquivo muito grande. O tamanho máximo é 50MB', true);
        return;
      }

      epubCurrentFile = file;
      document.getElementById('epubFileName').textContent = file.name;
      document.getElementById('epubFileSize').textContent = formatFileSize(file.size);
      document.getElementById('epubSelectedFile').classList.add('show');
      document.getElementById('epubConvertBtn').classList.add('show');
    }

    function removeEpubFile() {
      epubCurrentFile = null;
      document.getElementById('docFile').value = '';
      document.getElementById('epubFileName').textContent = '';
      document.getElementById('epubFileSize').textContent = '';
      document.getElementById('epubSelectedFile').classList.remove('show');
      document.getElementById('epubConvertBtn').classList.remove('show');
      showEpubStatus('');
    }

    function updateEpubProgress(percent, text) {
      document.getElementById('epubProgressBar').style.width = percent + '%';
      document.getElementById('epubProgressText').textContent = text;
    }

    function showEpubStatus(message, isError = false) {
      const status = document.getElementById('epubConversionStatus');
      status.textContent = message;
      status.classList.add('show');
      if (isError) {
        status.style.color = '#ef4444';
      } else {
        status.style.color = '#10b981';
      }
    }

    async function extractTextFromFile(file) {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return await extractTextFromPDF(file);
      } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        return await file.text();
      } else if (fileType === 'text/html' || fileName.endsWith('.html')) {
        const html = await file.text();
        return html.replace(/<[^>]*>/g, '\n');
      } else {
        return await extractTextFromDocx(file);
      }
    }

    async function extractTextFromPDF(file) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
      }

      return fullText;
    }

    async function extractTextFromDocx(file) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const zip = new PizZip(arrayBuffer);
        const xmlContent = zip.file('word/document.xml');
        if (xmlContent) {
          const xml = xmlContent.asText();
          return xml.replace(/<[^>]*>/g, '\n').replace(/&nbsp;/g, ' ');
        }
      } catch (e) {
        console.log('Não foi possível extrair de DOCX, usando fallback');
      }
      return 'Conteúdo do documento';
    }

    function createEpub(title, author, content, language) {
      const date = new Date().toISOString().split('T')[0];
      const zip = new PizZip();

      zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

      zip.folder('META-INF').file('container.xml', 
`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

      const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(title || 'Sem Título')}</dc:title>
    <dc:creator>${escapeXml(author || 'Desconhecido')}</dc:creator>
    <dc:language>${language || 'pt-BR'}</dc:language>
    <dc:date>${date}</dc:date>
    <dc:identifier id="book-id">urn:uuid:${generateUUID()}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.html" media-type="application/xhtml+xml" properties="nav"/>
    <item id="content" href="content.html" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="nav"/>
    <itemref idref="content"/>
  </spine>
</package>`;

      zip.folder('OEBPS').file('content.opf', contentOpf);

      const htmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${language || 'pt-BR'}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(title || 'Sem Título')}</title>
  <style>
    body {
      font-family: Georgia, serif;
      margin: 20px;
      line-height: 1.6;
      text-align: justify;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: bold;
    }
    p {
      margin-bottom: 1em;
      text-indent: 1.5em;
    }
    .title {
      text-align: center;
      font-size: 2em;
      font-weight: bold;
      margin-bottom: 0.5em;
    }
    .author {
      text-align: center;
      font-size: 1.2em;
      margin-bottom: 2em;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="title">${escapeXml(title || 'Sem Título')}</div>
  <div class="author">Por ${escapeXml(author || 'Desconhecido')}</div>
  <div class="content">
    ${content.split('\n\n').map(para => 
      para.trim() ? `<p>${escapeXml(para)}</p>` : ''
    ).join('')}
  </div>
</body>
</html>`;

      zip.folder('OEBPS').file('content.html', htmlContent);

      const navHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${language || 'pt-BR'}">
<head>
  <meta charset="UTF-8"/>
  <title>Índice</title>
</head>
<body>
  <nav epub:type="toc">
    <ol>
      <li><a href="content.html">${escapeXml(title || 'Conteúdo')}</a></li>
    </ol>
  </nav>
</body>
</html>`;

      zip.folder('OEBPS').file('nav.html', navHtml);

      const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${generateUUID()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title || 'Sem Título')}</text></docTitle>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel><text>${escapeXml(title || 'Conteúdo')}</text></navLabel>
      <content src="content.html"/>
    </navPoint>
  </navMap>
</ncx>`;

      zip.folder('OEBPS').file('toc.ncx', tocNcx);

      return zip;
    }

    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    async function convertToEpub() {
      if (!epubCurrentFile) return;

      const epubConvertBtn = document.getElementById('epubConvertBtn');
      epubConvertBtn.disabled = true;
      document.getElementById('epubConversionProgress').classList.add('show');
      document.getElementById('epubConversionStatus').classList.remove('show');
      
      try {
        updateEpubProgress(10, 'Carregando arquivo...');

        const text = await extractTextFromFile(epubCurrentFile);
        updateEpubProgress(50, 'Processando conteúdo...');

        const title = document.getElementById('epubTitle').value || epubCurrentFile.name.replace(/\.[^.]+$/, '');
        const author = document.getElementById('epubAuthor').value || 'Autor Desconhecido';
        const language = document.getElementById('epubLanguage').value || 'pt-BR';

        updateEpubProgress(75, 'Criando e-book EPUB...');

        const zip = createEpub(title, author, text, language);
        const blob = zip.generate({ type: 'blob', mimeType: 'application/epub+zip' });

        updateEpubProgress(100, 'Concluído!');

        const outputFileName = title.replace(/[^a-zA-Z0-9]/g, '_') + '.epub';
        saveAs(blob, outputFileName);

        showEpubStatus(`✓ E-book "${outputFileName}" criado com sucesso!`, false);
        
        setTimeout(() => {
          removeEpubFile();
          document.getElementById('epubConversionProgress').classList.remove('show');
        }, 2000);

      } catch (error) {
        console.error('Erro na conversão:', error);
        showEpubStatus('Erro ao converter o arquivo. Por favor, tente novamente.', true);
      } finally {
        epubConvertBtn.disabled = false;
      }
    }

    // Image Converter
    let currentImageFile = null;
    let currentResizeFile = null;
    let currentCompressFile = null;
    let currentResizedBlob = null;
    let currentCompressedBlob = null;
    let currentDecodedDataUrl = null;
    let currentRemoveBgFile = null;
    let currentRemoveBgBlob = null;
    let currentEnhanceFile = null;
    let currentEnhancedBlob = null;
    let spriteFiles = [];
    let currentSpriteBlob = null;

    // Tool tabs switching
    document.querySelectorAll('.tool-tab').forEach(tab => {
      tab.addEventListener('click', function() {
        const tool = this.dataset.tool;
        document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.tool-section').forEach(s => s.classList.remove('active'));
        document.getElementById(tool + '-tool').classList.add('active');
      });
    });

    // Image file upload
    document.getElementById('imageFile').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) handleImageFileSelect(file);
    });

    const imageUploadArea = document.getElementById('imageUploadArea');
    imageUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      imageUploadArea.classList.add('dragover');
    });
    imageUploadArea.addEventListener('dragleave', () => {
      imageUploadArea.classList.remove('dragover');
    });
    imageUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      imageUploadArea.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleImageFileSelect(e.dataTransfer.files[0]);
      }
    });

    function handleImageFileSelect(file) {
      if (!file.type.startsWith('image/')) {
        showImageStatus('Por favor, selecione um arquivo de imagem válido', true);
        return;
      }
      currentImageFile = file;
      document.getElementById('imageFileName').textContent = file.name;
      document.getElementById('imageFileSize').textContent = formatFileSize(file.size);
      document.getElementById('imageSelectedFile').classList.add('show');
    }

    function removeImageFile() {
      currentImageFile = null;
      document.getElementById('imageFile').value = '';
      document.getElementById('imageSelectedFile').classList.remove('show');
    }

    let imageStatusTimeout;
    function showImageStatus(message, isError = false) {
      const status = document.getElementById('imageConversionStatus');
      status.textContent = message;
      status.classList.add('show');
      status.style.color = isError ? '#ef4444' : '#10b981';
      
      // Auto-hide success messages after 3 seconds
      clearTimeout(imageStatusTimeout);
      if (!isError) {
        imageStatusTimeout = setTimeout(() => {
          status.classList.remove('show');
        }, 3000);
      }
    }

    function updateImageProgress(percent, text) {
      document.getElementById('imageProgressBar').style.width = percent + '%';
      document.getElementById('imageProgressText').textContent = text;
    }

    async function convertImageFormat(targetFormat) {
      if (!currentImageFile) {
        showImageStatus('Por favor, selecione uma imagem primeiro', true);
        return;
      }

      document.getElementById('imageConversionProgress').classList.add('show');
      updateImageProgress(20, 'Carregando imagem...');

      try {
        const img = new Image();
        const url = URL.createObjectURL(currentImageFile);
        
        img.onload = async function() {
          updateImageProgress(50, 'Convertendo...');
          
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          if (targetFormat === 'pdf') {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            const imgData = canvas.toDataURL('image/jpeg');
            const width = pdf.internal.pageSize.getWidth();
            const height = (img.height * width) / img.width;
            pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
            pdf.save(currentImageFile.name.replace(/\.[^.]+$/, '.pdf'));
          } else {
            const mimeType = `image/${targetFormat === 'jpeg' ? 'jpeg' : targetFormat}`;
            canvas.toBlob(blob => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = currentImageFile.name.replace(/\.[^.]+$/, '.' + (targetFormat === 'jpeg' ? 'jpg' : targetFormat));
              a.click();
              URL.revokeObjectURL(url);
              removeImageFile();
              updateImageProgress(100, 'Concluído!');
              showImageStatus(`✓ Imagem convertida para ${targetFormat.toUpperCase()}!`);
              setTimeout(() => document.getElementById('imageConversionProgress').classList.remove('show'), 1500);
            }, mimeType, 0.95);
          }
        };
        
        img.onerror = () => {
          showImageStatus('Erro ao carregar a imagem', true);
        };
        
        img.src = url;
      } catch (error) {
        console.error('Erro:', error);
        showImageStatus('Erro na conversão', true);
      }
    }

    // Resize image
    document.getElementById('resizeFile').addEventListener('change', function(e) {
      if (e.target.files[0]) {
        currentResizeFile = e.target.files[0];
        document.getElementById('resizeFileName').textContent = e.target.files[0].name;
        document.getElementById('resizeSelectedFile').classList.add('show');
      }
    });

    function removeResizeFile() {
      currentResizeFile = null;
      document.getElementById('resizeFile').value = '';
      document.getElementById('resizeSelectedFile').classList.remove('show');
    }

    function resizeImage() {
      if (!currentResizeFile) {
        showImageStatus('Por favor, selecione uma imagem', true);
        return;
      }

      const width = parseInt(document.getElementById('resizeWidth').value);
      const height = parseInt(document.getElementById('resizeHeight').value);

      if (!width || !height || width < 1 || height < 1) {
        showImageStatus('Por favor, insira dimensões válidas', true);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(currentResizeFile);

      img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(blob => {
          currentResizedBlob = blob;
          const previewUrl = URL.createObjectURL(blob);
          
          const previewImg = document.getElementById('resizePreviewImg');
          previewImg.src = previewUrl;
          previewImg.style.display = 'block';
          
          const placeholder = document.getElementById('resizePreviewPlaceholder');
          if (placeholder) placeholder.style.display = 'none';
          
          document.getElementById('resizeDownloadBtn').style.display = 'block';
          
          showImageStatus(`✓ Imagem redimensionada para ${width}x${height}! Clique em "Baixar" para salvar.`);
          URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.95);
      };

      img.src = url;
    }

    function downloadResizedImage() {
      if (!currentResizedBlob || !currentResizeFile) {
        showImageStatus('Por favor, redimensione uma imagem primeiro', true);
        return;
      }
      
      const width = parseInt(document.getElementById('resizeWidth').value);
      const height = parseInt(document.getElementById('resizeHeight').value);
      const fileName = `redimensionado-${width}x${height}-${currentResizeFile.name}`;
      
      const url = URL.createObjectURL(currentResizedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      showImageStatus('✓ Imagem salva com sucesso!');
      currentResizedBlob = null;
      removeResizeFile();
    }

    // Compress image
    document.getElementById('compressFile').addEventListener('change', function(e) {
      if (e.target.files[0]) {
        currentCompressFile = e.target.files[0];
        document.getElementById('compressFileName').textContent = e.target.files[0].name;
        document.getElementById('compressSelectedFile').classList.add('show');
      }
    });

    document.getElementById('qualitySlider').addEventListener('input', function() {
      document.getElementById('qualityValue').textContent = this.value + '%';
    });

    function removeCompressFile() {
      currentCompressFile = null;
      document.getElementById('compressFile').value = '';
      document.getElementById('compressSelectedFile').classList.remove('show');
    }

    function compressImage() {
      if (!currentCompressFile) {
        showImageStatus('Por favor, selecione uma imagem', true);
        return;
      }

      const quality = document.getElementById('qualitySlider').value / 100;
      const img = new Image();
      const url = URL.createObjectURL(currentCompressFile);

      img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(blob => {
          currentCompressedBlob = blob;
          const reduction = ((1 - blob.size / currentCompressFile.size) * 100).toFixed(1);
          const previewUrl = URL.createObjectURL(blob);
          
          const previewImg = document.getElementById('compressPreviewImg');
          previewImg.src = previewUrl;
          previewImg.style.display = 'block';
          
          const placeholder = document.getElementById('compressPreviewPlaceholder');
          if (placeholder) placeholder.style.display = 'none';
          
          document.getElementById('compressDownloadBtn').style.display = 'block';
          
          showImageStatus(`✓ Imagem comprimida! Redução: ${reduction}% | Clique em "Baixar" para salvar.`);
          URL.revokeObjectURL(url);
        }, 'image/jpeg', quality);
      };

      img.src = url;
    }

    function downloadCompressedImage() {
      if (!currentCompressedBlob || !currentCompressFile) {
        showImageStatus('Por favor, comprima uma imagem primeiro', true);
        return;
      }
      
      const fileName = `comprimido-${currentCompressFile.name}`;
      
      const url = URL.createObjectURL(currentCompressedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      showImageStatus('✓ Imagem salva com sucesso!');
      currentCompressedBlob = null;
      removeCompressFile();
    }

    // Base64 conversion
    function switchBase64Mode(mode) {
      document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      
      document.querySelectorAll('.base64-mode-content').forEach(content => content.classList.remove('active'));
      document.getElementById(mode + '-mode').classList.add('active');

      if (mode === 'encode') {
        document.getElementById('base64File').click();
      }
    }

    document.getElementById('base64File').addEventListener('change', function(e) {
      if (e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(event) {
          document.getElementById('base64Output').value = event.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    });

    function copyBase64() {
      const text = document.getElementById('base64Output').value;
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          showImageStatus('✓ Copiado para a área de transferência!');
        });
      }
    }

    function decodeBase64() {
      const base64String = document.getElementById('base64Input').value.trim();
      
      if (!base64String) {
        showImageStatus('Por favor, cole um código Base64', true);
        return;
      }

      try {
        const img = document.createElement('img');
        img.src = base64String;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        
        img.onload = function() {
          currentDecodedDataUrl = base64String;
          
          document.getElementById('decodedImageContainer').innerHTML = '';
          document.getElementById('decodedImageContainer').appendChild(img);
          document.getElementById('base64DownloadBtn').style.display = 'block';
          
          showImageStatus('✓ Imagem decodificada com sucesso! Clique em "Baixar Imagem" para salvar.');
        };
        
        img.onerror = function() {
          showImageStatus('Erro ao decodificar Base64', true);
        };
      } catch (error) {
        showImageStatus('Erro ao decodificar Base64', true);
      }
    }

    function downloadDecodedImage() {
      if (!currentDecodedDataUrl) {
        showImageStatus('Por favor, decodifique uma imagem Base64 primeiro', true);
        return;
      }
      
      const canvas = document.createElement('canvas');
      const img = new Image();
      
      img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(blob => {
          const fileName = `decodificado-${Date.now()}.png`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
          
          showImageStatus('✓ Imagem salva com sucesso!');
        });
      };
      
      img.src = currentDecodedDataUrl;
    }

    function formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Remove Background Tool
    document.getElementById('removebgFile').addEventListener('change', function(e) {
      if (e.target.files[0]) {
        currentRemoveBgFile = e.target.files[0];
        document.getElementById('removebgFileName').textContent = e.target.files[0].name;
        document.getElementById('removebgSelectedFile').classList.add('show');
      }
    });

    document.getElementById('toleranceSlider').addEventListener('input', function() {
      document.getElementById('toleranceValue').textContent = this.value;
    });

    function removeRemoveBgFile() {
      currentRemoveBgFile = null;
      document.getElementById('removebgFile').value = '';
      document.getElementById('removebgSelectedFile').classList.remove('show');
    }

    function removeBackground() {
      if (!currentRemoveBgFile) {
        showImageStatus('Por favor, selecione uma imagem', true);
        return;
      }

      const tolerance = document.getElementById('toleranceSlider').value / 100;
      const img = new Image();
      const url = URL.createObjectURL(currentRemoveBgFile);

      img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Detectar cor de fundo predominante (canto superior esquerdo)
        const bgColor = {
          r: data[0],
          g: data[1],
          b: data[2]
        };

        // Remover fundo baseado na cor
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const diff = Math.sqrt(
            Math.pow(r - bgColor.r, 2) +
            Math.pow(g - bgColor.g, 2) +
            Math.pow(b - bgColor.b, 2)
          ) / Math.sqrt(3 * Math.pow(255, 2));

          if (diff < tolerance) {
            data[i + 3] = 0; // Fazer transparente
          }
        }

        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob(blob => {
          currentRemoveBgBlob = blob;
          const previewUrl = URL.createObjectURL(blob);
          
          const previewImg = document.getElementById('removebgPreviewImg');
          previewImg.src = previewUrl;
          previewImg.style.display = 'block';
          
          const placeholder = document.getElementById('removebgPreviewPlaceholder');
          if (placeholder) placeholder.style.display = 'none';
          
          document.getElementById('removebgDownloadBtn').style.display = 'block';
          
          showImageStatus('✓ Fundo removido com sucesso! Clique em "Baixar Imagem (PNG)" para salvar.');
          URL.revokeObjectURL(url);
        }, 'image/png');
      };

      img.src = url;
    }

    function downloadRemoveBgImage() {
      if (!currentRemoveBgBlob || !currentRemoveBgFile) {
        showImageStatus('Por favor, remova o fundo de uma imagem primeiro', true);
        return;
      }
      
      const fileName = `sem-fundo-${currentRemoveBgFile.name.split('.')[0]}.png`;
      
      const url = URL.createObjectURL(currentRemoveBgBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      showImageStatus('✓ Imagem salva com sucesso!');
      currentRemoveBgBlob = null;
      removeRemoveBgFile();
    }

    // Enhance Image Tool
    document.getElementById('enhanceFile').addEventListener('change', function(e) {
      if (e.target.files[0]) {
        currentEnhanceFile = e.target.files[0];
        document.getElementById('enhanceFileName').textContent = e.target.files[0].name;
        document.getElementById('enhanceSelectedFile').classList.add('show');
      }
    });

    // Real-time enhancement with debouncing
    let enhanceTimeout;
    function updateEnhanceRealTime() {
      clearTimeout(enhanceTimeout);
      enhanceTimeout = setTimeout(() => {
        if (currentEnhanceFile) {
          enhanceImage();
        }
      }, 50);
    }

    document.getElementById('contrastSlider').addEventListener('input', function() {
      document.getElementById('contrastValue').textContent = this.value;
      updateEnhanceRealTime();
    });

    document.getElementById('brightnessSlider').addEventListener('input', function() {
      document.getElementById('brightnessValue').textContent = this.value;
      updateEnhanceRealTime();
    });

    document.getElementById('saturationSlider').addEventListener('input', function() {
      document.getElementById('saturationValue').textContent = this.value;
      updateEnhanceRealTime();
    });

    document.getElementById('sharpnessSlider').addEventListener('input', function() {
      document.getElementById('sharpnessValue').textContent = this.value;
      updateEnhanceRealTime();
    });

    document.getElementById('denoisingSlider').addEventListener('input', function() {
      document.getElementById('denoisingValue').textContent = this.value;
      updateEnhanceRealTime();
    });

    document.getElementById('claritySlider').addEventListener('input', function() {
      document.getElementById('clarityValue').textContent = this.value;
      updateEnhanceRealTime();
    });

    document.getElementById('smoothingSlider').addEventListener('input', function() {
      document.getElementById('smoothingValue').textContent = this.value;
      updateEnhanceRealTime();
    });

    function removeEnhanceFile() {
      currentEnhanceFile = null;
      document.getElementById('enhanceFile').value = '';
      document.getElementById('enhanceSelectedFile').classList.remove('show');
    }

    function toggleAdvanced() {
      const advancedControls = document.getElementById('advancedControls');
      const btn = event.target;
      if (advancedControls.style.display === 'none') {
        advancedControls.style.display = 'block';
        btn.textContent = 'Ocultar controles avançados';
      } else {
        advancedControls.style.display = 'none';
        btn.textContent = 'Mostrar controles avançados';
      }
    }

    function applyPreset(presetName) {
      const presets = {
        // Influencer - Cores vibrantes, tons quentes/frios, feed harmonioso
        influencer: { 
          contrast: 120, brightness: 105, saturation: 145, 
          sharpness: 25, denoising: 10, clarity: 20, smoothing: 0 
        },
        // Cinemático - Alto contraste, pretos profundos, tons urbanos e dramáticos
        cinematic: { 
          contrast: 145, brightness: 95, saturation: 85, 
          sharpness: 40, denoising: 20, clarity: 35, smoothing: 5 
        },
        // Casamento/Família - Suaves, tons de pele realçados, estilo "film look"
        wedding: { 
          contrast: 105, brightness: 108, saturation: 110, 
          sharpness: 15, denoising: 35, clarity: 10, smoothing: 15 
        },
        // Paisagem - Cores ricas, detalhes aprimorados em céus e natureza
        landscape: { 
          contrast: 130, brightness: 108, saturation: 155, 
          sharpness: 45, denoising: 10, clarity: 40, smoothing: 0 
        },
        // Retrato - Pele suave, olhos vivos, tons naturais
        portrait: { 
          contrast: 115, brightness: 100, saturation: 125, 
          sharpness: 20, denoising: 30, clarity: 15, smoothing: 8 
        },
        // Produto - Cores fiéis, detalhes nítidos
        product: { 
          contrast: 135, brightness: 112, saturation: 105, 
          sharpness: 55, denoising: 15, clarity: 40, smoothing: 0 
        },
        // Comida - Cores quentes e apetitosas
        food: { 
          contrast: 120, brightness: 115, saturation: 170, 
          sharpness: 30, denoising: 8, clarity: 20, smoothing: 0 
        },
        // Preto e Branco - Clássico e intemporal
        blackwhite: { 
          contrast: 150, brightness: 100, saturation: 0, 
          sharpness: 45, denoising: 25, clarity: 35, smoothing: 3 
        },
        // HDR - Detalhes em todos os tons
        hdr: { 
          contrast: 155, brightness: 120, saturation: 135, 
          sharpness: 50, denoising: 20, clarity: 45, smoothing: 0 
        }
      };

      const preset = presets[presetName];
      if (preset) {
        // Cancel any pending enhance operations
        clearTimeout(enhanceTimeout);
        
        // Update all sliders instantly
        document.getElementById('contrastSlider').value = preset.contrast;
        document.getElementById('contrastValue').textContent = preset.contrast;
        
        document.getElementById('brightnessSlider').value = preset.brightness;
        document.getElementById('brightnessValue').textContent = preset.brightness;
        
        document.getElementById('saturationSlider').value = preset.saturation;
        document.getElementById('saturationValue').textContent = preset.saturation;

        document.getElementById('sharpnessSlider').value = preset.sharpness;
        document.getElementById('sharpnessValue').textContent = preset.sharpness;

        document.getElementById('denoisingSlider').value = preset.denoising;
        document.getElementById('denoisingValue').textContent = preset.denoising;

        document.getElementById('claritySlider').value = preset.clarity;
        document.getElementById('clarityValue').textContent = preset.clarity;

        document.getElementById('smoothingSlider').value = preset.smoothing;
        document.getElementById('smoothingValue').textContent = preset.smoothing;
        
        // Apply immediately with short delay for smooth transition
        enhanceTimeout = setTimeout(() => {
          if (currentEnhanceFile) {
            enhanceImage();
            showImageStatus(`✓ Preset "${presetName}" aplicado!`);
          }
        }, 10);
      }
    }

    function applySharpnessKernel(imageData, amount) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const kernel = [0, -amount, 0, -amount, 1 + 4 * amount, -amount, 0, -amount, 0];
      
      for (let i = width * 4; i < data.length - width * 4; i++) {
        if ((i / 4) % width > 0 && (i / 4) % width < width - 1) {
          for (let c = 0; c < 3; c++) {
            let pixel = 0;
            pixel += data[i - width * 4 + c] * kernel[0];
            pixel += data[i - 4 + c] * kernel[1];
            pixel += data[i + c] * kernel[2];
            pixel += data[i - width * 4 + 4 + c] * kernel[3];
            pixel += data[i + 4 + c] * kernel[4];
            pixel += data[i + width * 4 - 4 + c] * kernel[5];
            pixel += data[i + width * 4 + c] * kernel[6];
            pixel += data[i + width * 4 + 4 + c] * kernel[7];
            data[i + c] = Math.max(0, Math.min(255, pixel));
          }
        }
      }
    }

    function applySharpnessKernelOptimized(imageData, amount) {
      const data = imageData.data;
      const width = imageData.width;
      const kernel = [0, -amount, 0, -amount, 1 + 4 * amount, -amount, 0, -amount, 0];
      const w4 = width * 4;
      
      // Sample every 2 pixels for faster processing
      for (let i = w4 + 8; i < data.length - w4 - 8; i += 8) {
        if ((i / 4) % width > 1 && (i / 4) % width < width - 2) {
          for (let c = 0; c < 3; c++) {
            let pixel = 0;
            pixel += data[i - w4 + c] * kernel[0];
            pixel += data[i - 4 + c] * kernel[1];
            pixel += data[i + c] * kernel[2];
            pixel += data[i - w4 + 4 + c] * kernel[3];
            pixel += data[i + 4 + c] * kernel[4];
            pixel += data[i + w4 - 4 + c] * kernel[5];
            pixel += data[i + w4 + c] * kernel[6];
            pixel += data[i + w4 + 4 + c] * kernel[7];
            data[i + c] = Math.max(0, Math.min(255, pixel));
          }
        }
      }
    }

    function applyDenoisingFilter(canvas, amount) {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const tempData = new Uint8ClampedArray(data);

      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          data[i + c] = data[i + c] * (1 - amount / 100) + tempData[i + c] * (amount / 100);
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }

    function applyDenoisingFilterOptimized(imageData, amount) {
      const data = imageData.data;
      const factor = 1 - amount / 100;
      const factorInv = amount / 100;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i] * factor + data[i] * factorInv;
        data[i + 1] = data[i + 1] * factor + data[i + 1] * factorInv;
        data[i + 2] = data[i + 2] * factor + data[i + 2] * factorInv;
      }
    }

    function applyClarityFilter(canvas, amount) {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      
      const tempData = new Uint8ClampedArray(data);
      
      for (let i = width * 4; i < data.length - width * 4; i++) {
        if ((i / 4) % width > 0 && (i / 4) % width < width - 1) {
          for (let c = 0; c < 3; c++) {
            const center = tempData[i + c];
            const surrounding = (tempData[i - 4 + c] + tempData[i + 4 + c] + tempData[i - width * 4 + c] + tempData[i + width * 4 + c]) / 4;
            const clarity = center + (center - surrounding) * (amount / 100) * 2;
            data[i + c] = Math.max(0, Math.min(255, clarity));
          }
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
    }

    function applyClarityFilterOptimized(imageData, amount) {
      const data = imageData.data;
      const width = imageData.width;
      const tempData = new Uint8ClampedArray(data);
      const w4 = width * 4;
      const factor = (amount / 100) * 2;
      
      for (let i = w4 + 4; i < data.length - w4 - 4; i += 4) {
        if ((i / 4) % width > 0 && (i / 4) % width < width - 1) {
          for (let c = 0; c < 3; c++) {
            const center = tempData[i + c];
            const surrounding = (tempData[i - 4 + c] + tempData[i + 4 + c] + tempData[i - w4 + c] + tempData[i + w4 + c]) / 4;
            data[i + c] = Math.max(0, Math.min(255, center + (center - surrounding) * factor));
          }
        }
      }
    }

    function applySmoothingFilter(canvas, amount) {
      const ctx = canvas.getContext('2d');
      ctx.filter = `blur(${amount / 10}px)`;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.putImageData(imageData, 0, 0);
    }

    function enhanceImage() {
      if (!currentEnhanceFile) {
        showImageStatus('Por favor, selecione uma imagem', true);
        return;
      }

      const contrast = document.getElementById('contrastSlider').value;
      const brightness = document.getElementById('brightnessSlider').value;
      const saturation = document.getElementById('saturationSlider').value;
      const sharpness = parseInt(document.getElementById('sharpnessSlider').value) || 0;
      const denoising = parseInt(document.getElementById('denoisingSlider').value) || 0;
      const clarity = parseInt(document.getElementById('claritySlider').value) || 0;
      const smoothing = parseInt(document.getElementById('smoothingSlider').value) || 0;

      const img = new Image();
      const url = URL.createObjectURL(currentEnhanceFile);

      img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // Apply CSS filters (fastest method)
        ctx.filter = `contrast(${contrast}%) brightness(${brightness}%) saturate(${saturation}%)`;
        ctx.drawImage(img, 0, 0);

        // Apply advanced filters only if needed (optimized for performance)
        if (clarity > 0 || denoising > 0 || sharpness > 0) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          if (clarity > 0) {
            applyClarityFilterOptimized(imageData, clarity);
          }
          
          if (denoising > 0) {
            applyDenoisingFilterOptimized(imageData, denoising);
          }
          
          if (sharpness > 0) {
            applySharpnessKernelOptimized(imageData, sharpness / 100);
          }
          
          ctx.putImageData(imageData, 0, 0);
        }

        if (smoothing > 0) {
          applySmoothingFilter(canvas, smoothing);
        }

        canvas.toBlob(blob => {
          currentEnhancedBlob = blob;
          const previewUrl = URL.createObjectURL(blob);
          
          const previewImg = document.getElementById('enhancePreviewImg');
          previewImg.src = previewUrl;
          previewImg.style.display = 'block';
          
          document.getElementById('enhancePreview').style.display = 'flex';
          document.getElementById('enhancePreviewPlaceholder').style.display = 'none';
          document.getElementById('enhanceDownloadBtn').style.display = 'block';
          
          URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.95);
      };

      img.src = url;
    }

    function downloadEnhancedImage() {
      if (!currentEnhancedBlob || !currentEnhanceFile) {
        showImageStatus('Por favor, melhore uma imagem primeiro', true);
        return;
      }
      
      const fileName = `melhorado-${currentEnhanceFile.name}`;
      
      const url = URL.createObjectURL(currentEnhancedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      showImageStatus('✓ Imagem salva com sucesso!');
      currentEnhancedBlob = null;
      removeEnhanceFile();
    }

    // Quick Convert Function for Enhance Tab
    function quickConvertEnhance() {
      if (!currentEnhanceFile) {
        showImageStatus('Por favor, selecione uma imagem primeiro', true);
        return;
      }

      const format = document.getElementById('enhanceConvertFormat').value.trim().toLowerCase();
      if (!format) {
        showImageStatus('Por favor, insira um formato (jpg, png, webp)', true);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(currentEnhanceFile);

      img.onload = async function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(blob => {
          const fileName = currentEnhanceFile.name.replace(/\.[^.]+$/, '.' + (format === 'jpeg' ? 'jpg' : format));
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(downloadUrl);
          
          showImageStatus(`✓ Imagem convertida para ${format.toUpperCase()}!`);
          URL.revokeObjectURL(url);
        }, `image/${format === 'jpg' ? 'jpeg' : format}`, 0.95);
      };

      img.onerror = () => {
        showImageStatus('Erro ao carregar a imagem', true);
      };

      img.src = url;
    }

    // Sprite Generator Tool (Split Generator)
    let currentSplitImage = null;
    let spriteSlips = [];
    
    document.getElementById('spriteFiles').addEventListener('change', function(e) {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        document.getElementById('spriteFileCount').textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = new Image();
          img.onload = function() {
            currentSplitImage = img;
            showImageStatus(`✓ Imagem carregada: ${file.name}`);
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    function generateSprite() {
      if (!currentSplitImage) {
        showImageStatus('Por favor, selecione uma imagem', true);
        return;
      }

      const slipCount = parseInt(document.getElementById('spriteSlipCount').value) || 9;
      const gridSize = Math.sqrt(slipCount);
      
      if (gridSize !== Math.floor(gridSize)) {
        showImageStatus('A quantidade deve ser um número quadrado perfeito (4, 9, 16, 25, etc.)', true);
        return;
      }

      spriteSlips = [];
      const slipWidth = currentSplitImage.width / gridSize;
      const slipHeight = currentSplitImage.height / gridSize;

      // Dividir a imagem em slips
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const canvas = document.createElement('canvas');
          canvas.width = slipWidth;
          canvas.height = slipHeight;
          const ctx = canvas.getContext('2d');
          
          ctx.drawImage(
            currentSplitImage,
            col * slipWidth, row * slipHeight, slipWidth, slipHeight,
            0, 0, slipWidth, slipHeight
          );
          
          canvas.toBlob(blob => {
            spriteSlips.push({
              blob: blob,
              index: row * gridSize + col + 1,
              row: row,
              col: col
            });
            
            if (spriteSlips.length === slipCount) {
              showSpritePreview();
            }
          }, 'image/png');
        }
      }
    }

    function showSpritePreview() {
      // Mostrar preview da primeira slip
      if (spriteSlips.length > 0) {
        const previewUrl = URL.createObjectURL(spriteSlips[0].blob);
        const previewImg = document.getElementById('spritePreviewImg');
        previewImg.src = previewUrl;
        previewImg.style.display = 'block';
        
        document.getElementById('spriteResult').style.display = 'block';
        document.getElementById('spriteDownloadBtn').style.display = 'block';
        document.getElementById('spriteDataUrl').value = `${spriteSlips.length} slips gerados (${Math.sqrt(spriteSlips.length)}x${Math.sqrt(spriteSlips.length)})`;
        
        showImageStatus(`✓ ${spriteSlips.length} slips gerados com sucesso! Clique em "Salvar ZIP" para download.`);
      }
    }

    function downloadSprite() {
      if (spriteSlips.length === 0) {
        showImageStatus('Por favor, gere os slips primeiro', true);
        return;
      }
      
      showImageStatus('Criando arquivo ZIP com os slips...');
      
      const zip = new PizZip();
      let processed = 0;

      spriteSlips.forEach(slip => {
        const reader = new FileReader();
        reader.onload = function(e) {
          const fileName = `slip-${String(slip.index).padStart(3, '0')}.png`;
          zip.file(fileName, e.target.result, { binary: true });
          processed++;
          
          if (processed === spriteSlips.length) {
            // Todos os slips foram adicionados ao ZIP
            const zipContent = zip.generate({ type: 'blob' });
            const zipUrl = URL.createObjectURL(zipContent);
            
            const fileName = `slips-${Date.now()}.zip`;
            const a = document.createElement('a');
            a.href = zipUrl;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(zipUrl);
            
            showImageStatus(`✓ ZIP com ${spriteSlips.length} slips salvo com sucesso!`);
            spriteSlips = [];
          }
        };
        
        reader.readAsArrayBuffer(slip.blob);
      });
    }

    function copySpriteData() {
      const dataUrl = document.getElementById('spriteDataUrl').value;
      if (dataUrl) {
        navigator.clipboard.writeText(dataUrl).then(() => {
          showImageStatus('✓ Data URL copiada para a área de transferência!');
        });
      }
    }

    // ===== RENDER 3D PROMOB MODULE =====
    let currentRenderFile = null;
    let currentRenderBlob = null;
    let renderEnhanceTimeout;

    document.getElementById('renderFile').addEventListener('change', function(e) {
      if (e.target.files[0]) handleRenderFileSelect(e.target.files[0]);
    });

    const renderUploadArea = document.getElementById('renderUploadArea');
    renderUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      renderUploadArea.classList.add('dragover');
    });
    renderUploadArea.addEventListener('dragleave', () => {
      renderUploadArea.classList.remove('dragover');
    });
    renderUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      renderUploadArea.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleRenderFileSelect(e.dataTransfer.files[0]);
      }
    });

    renderUploadArea.addEventListener('click', () => {
      document.getElementById('renderFile').click();
    });

    function handleRenderFileSelect(file) {
      if (!file.type.startsWith('image/')) {
        showRenderStatus('Por favor, selecione um arquivo de imagem válido', true);
        return;
      }
      
      currentRenderFile = file;
      document.getElementById('renderFileName').textContent = file.name;
      document.getElementById('renderFileSize').textContent = formatFileSize(file.size);
      document.getElementById('renderSelectedFile').classList.add('show');
      document.getElementById('renderApplyBtn').style.display = 'inline-block';

      // Show preview
      const reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById('renderPreviewImg').src = e.target.result;
        document.getElementById('renderPreviewImg').style.display = 'block';
        document.getElementById('renderPreviewPlaceholder').style.display = 'none';
      };
      reader.readAsDataURL(file);
    }

    function removeRenderFile() {
      currentRenderFile = null;
      document.getElementById('renderFile').value = '';
      document.getElementById('renderSelectedFile').classList.remove('show');
      document.getElementById('renderApplyBtn').style.display = 'none';
      document.getElementById('renderDownloadBtn').style.display = 'none';
      document.getElementById('renderPreviewImg').style.display = 'none';
      document.getElementById('renderPreviewPlaceholder').style.display = 'flex';
    }

    function showRenderStatus(message, isError = false) {
      const status = document.getElementById('renderStatus');
      status.textContent = message;
      status.classList.add('show');
      status.style.color = isError ? '#ef4444' : '#10b981';
      
      clearTimeout(renderEnhanceTimeout);
      if (!isError) {
        renderEnhanceTimeout = setTimeout(() => {
          status.classList.remove('show');
        }, 3000);
      }
    }

    // Real-time enhancement for render sliders
    function updateRenderEnhanceRealTime() {
      if (currentRenderFile) {
        applyRenderEnhance();
      }
    }

    document.getElementById('renderLighting').addEventListener('input', function() {
      document.getElementById('renderLightingValue').textContent = this.value + '%';
      updateRenderEnhanceRealTime();
    });

    document.getElementById('renderContrast').addEventListener('input', function() {
      document.getElementById('renderContrastValue').textContent = this.value + '%';
      updateRenderEnhanceRealTime();
    });

    document.getElementById('renderSaturation').addEventListener('input', function() {
      document.getElementById('renderSaturationValue').textContent = this.value + '%';
      updateRenderEnhanceRealTime();
    });

    document.getElementById('renderSharpness').addEventListener('input', function() {
      document.getElementById('renderSharpnessValue').textContent = this.value + '%';
      updateRenderEnhanceRealTime();
    });

    document.getElementById('renderBrightness').addEventListener('input', function() {
      document.getElementById('renderBrightnessValue').textContent = this.value + '%';
      updateRenderEnhanceRealTime();
    });

    document.getElementById('renderTemperature').addEventListener('input', function() {
      const val = parseInt(this.value);
      let temp = 'Neutra';
      if (val < -20) temp = '❄️ Muito Frio';
      else if (val < 0) temp = 'Frio';
      else if (val > 20) temp = '🔥 Muito Quente';
      else if (val > 0) temp = 'Quente';
      document.getElementById('renderTemperatureValue').textContent = temp;
      updateRenderEnhanceRealTime();
    });

    function applyRenderPreset(presetName) {
      const presets = {
        natural: { lighting: 100, contrast: 100, saturation: 110, sharpness: 15, brightness: 100, temperature: 0 },
        vibrant: { lighting: 110, contrast: 130, saturation: 150, sharpness: 25, brightness: 105, temperature: 10 },
        professional: { lighting: 105, contrast: 115, saturation: 120, sharpness: 30, brightness: 102, temperature: 5 },
        showcase: { lighting: 120, contrast: 140, saturation: 140, sharpness: 40, brightness: 110, temperature: 15 },
        warm: { lighting: 115, contrast: 110, saturation: 125, sharpness: 20, brightness: 108, temperature: 30 },
        cool: { lighting: 105, contrast: 120, saturation: 110, sharpness: 25, brightness: 98, temperature: -30 }
      };

      const preset = presets[presetName];
      if (preset) {
        clearTimeout(renderEnhanceTimeout);
        
        document.getElementById('renderLighting').value = preset.lighting;
        document.getElementById('renderLightingValue').textContent = preset.lighting + '%';
        
        document.getElementById('renderContrast').value = preset.contrast;
        document.getElementById('renderContrastValue').textContent = preset.contrast + '%';
        
        document.getElementById('renderSaturation').value = preset.saturation;
        document.getElementById('renderSaturationValue').textContent = preset.saturation + '%';
        
        document.getElementById('renderSharpness').value = preset.sharpness;
        document.getElementById('renderSharpnessValue').textContent = preset.sharpness + '%';
        
        document.getElementById('renderBrightness').value = preset.brightness;
        document.getElementById('renderBrightnessValue').textContent = preset.brightness + '%';
        
        document.getElementById('renderTemperature').value = preset.temperature;
        const tempVal = preset.temperature;
        let temp = 'Neutra';
        if (tempVal < -20) temp = '❄️ Muito Frio';
        else if (tempVal < 0) temp = 'Frio';
        else if (tempVal > 20) temp = '🔥 Muito Quente';
        else if (tempVal > 0) temp = 'Quente';
        document.getElementById('renderTemperatureValue').textContent = temp;
        
        renderEnhanceTimeout = setTimeout(() => {
          if (currentRenderFile) {
            applyRenderEnhance();
            showRenderStatus(`✓ Preset "${presetName}" aplicado!`);
          }
        }, 10);
      }
    }

    function applyRenderEnhance() {
      if (!currentRenderFile) return;

      const lighting = parseInt(document.getElementById('renderLighting').value);
      const contrast = parseInt(document.getElementById('renderContrast').value);
      const saturation = parseInt(document.getElementById('renderSaturation').value);
      const sharpness = parseInt(document.getElementById('renderSharpness').value);
      const brightness = parseInt(document.getElementById('renderBrightness').value);
      const temperature = parseInt(document.getElementById('renderTemperature').value);

      const img = new Image();
      const url = URL.createObjectURL(currentRenderFile);

      img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // Apply lighting and color filters
        let tempFilter = 'sepia(0%)';
        if (temperature > 0) {
          tempFilter = `sepia(${temperature / 50 * 10}%)`;
        }

        ctx.filter = `contrast(${contrast}%) brightness(${brightness}%) saturate(${saturation}%) ${tempFilter}`;
        ctx.drawImage(img, 0, 0);

        // Apply sharpness if needed
        if (sharpness > 0) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          const width = canvas.width;
          const kernel = [0, -sharpness / 100, 0, -sharpness / 100, 1 + 4 * (sharpness / 100), -sharpness / 100, 0, -sharpness / 100, 0];
          
          for (let i = width * 4; i < data.length - width * 4; i++) {
            if ((i / 4) % width > 0 && (i / 4) % width < width - 1) {
              for (let c = 0; c < 3; c++) {
                let pixel = 0;
                pixel += data[i - width * 4 + c] * kernel[0];
                pixel += data[i - 4 + c] * kernel[1];
                pixel += data[i + c] * kernel[2];
                pixel += data[i - width * 4 + 4 + c] * kernel[3];
                pixel += data[i + 4 + c] * kernel[4];
                pixel += data[i + width * 4 - 4 + c] * kernel[5];
                pixel += data[i + width * 4 + c] * kernel[6];
                pixel += data[i + width * 4 + 4 + c] * kernel[7];
                data[i + c] = Math.max(0, Math.min(255, pixel));
              }
            }
          }
          ctx.putImageData(imageData, 0, 0);
        }

        canvas.toBlob(blob => {
          currentRenderBlob = blob;
          const previewUrl = URL.createObjectURL(blob);
          document.getElementById('renderPreviewImg').src = previewUrl;
          document.getElementById('renderDownloadBtn').style.display = 'inline-block';
          URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.95);
      };

      img.src = url;
    }

    function downloadRenderImage() {
      if (!currentRenderBlob || !currentRenderFile) {
        showRenderStatus('Por favor, melhore um render primeiro', true);
        return;
      }
      
      const fileName = `render-melhorado-${currentRenderFile.name}`;
      const url = URL.createObjectURL(currentRenderBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      showRenderStatus('✓ Render salvo com sucesso!');
      currentRenderBlob = null;
      removeRenderFile();
    }

    function resetRenderControls() {
      document.getElementById('renderLighting').value = 100;
      document.getElementById('renderLightingValue').textContent = '100%';
      
      document.getElementById('renderContrast').value = 100;
      document.getElementById('renderContrastValue').textContent = '100%';
      
      document.getElementById('renderSaturation').value = 100;
      document.getElementById('renderSaturationValue').textContent = '100%';
      
      document.getElementById('renderSharpness').value = 0;
      document.getElementById('renderSharpnessValue').textContent = '0%';
      
      document.getElementById('renderBrightness').value = 100;
      document.getElementById('renderBrightnessValue').textContent = '100%';
      
      document.getElementById('renderTemperature').value = 0;
      document.getElementById('renderTemperatureValue').textContent = 'Neutra';

      if (currentRenderFile) {
        applyRenderEnhance();
        showRenderStatus('✓ Controles resetados!');
      }
    }

    updateRemoveButtons();
    updatePreviewItems();