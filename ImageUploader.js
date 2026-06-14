/**
 * ImageUploader.js
 * Componente de upload de imagem para o painel admin.
 *
 * COMPORTAMENTO:
 * - Mostra preview da imagem atual (existente ou recém-selecionada)
 * - Upload para Supabase Storage ao selecionar arquivo
 * - Retorna URL pública via onUpload(url)
 * - Se nenhuma imagem nova for selecionada, preserva a existente
 * - Fallback visual quando não há imagem
 * - Nunca armazena base64
 */

// Importado inline pois este arquivo é injetado no bundle monolítico
// As funções uploadImage e safeImageUrl são acessadas via window.StorageService

function ImageUploader({ currentUrl, onUpload, onError }) {
  const [preview,    setPreview]    = React.useState(currentUrl || null);
  const [uploading,  setUploading]  = React.useState(false);
  const [uploadErr,  setUploadErr]  = React.useState('');
  const [progress,   setProgress]   = React.useState(0);
  const inputRef = React.useRef(null);

  // Sincroniza preview se currentUrl mudar externamente (ex: ao abrir modal de outro produto)
  React.useEffect(() => {
    setPreview(currentUrl || null);
    setUploadErr('');
  }, [currentUrl]);

  const isValidUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('http://') || url.startsWith('https://');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadErr('');
    setUploading(true);
    setProgress(10);

    // Preview local imediato (só para visualização, não persiste como base64)
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setProgress(30);

    try {
      // Verifica se storageService está disponível
      if (!window.StorageService?.uploadImage) {
        throw new Error('Serviço de storage não disponível.');
      }

      setProgress(50);
      const publicUrl = await window.StorageService.uploadImage(file);
      setProgress(90);

      if (!publicUrl) throw new Error('Upload falhou — URL não retornada.');

      // Revoga URL local e usa URL pública do Supabase
      URL.revokeObjectURL(localPreview);
      setPreview(publicUrl);
      setProgress(100);

      onUpload?.(publicUrl);
      console.log('[ImageUploader] ✅ Upload concluído:', publicUrl);
    } catch (err) {
      console.error('[ImageUploader] Upload error:', err);
      setUploadErr(err.message || 'Erro ao fazer upload da imagem.');
      // Reverte preview para a imagem anterior em caso de erro
      setPreview(currentUrl || null);
      URL.revokeObjectURL(localPreview);
      onError?.(err.message);
    } finally {
      setUploading(false);
      setProgress(0);
      // Limpa input para permitir re-upload do mesmo arquivo
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setUploadErr('');
    onUpload?.(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleUrlInput = (e) => {
    const url = e.target.value.trim();
    setPreview(isValidUrl(url) ? url : null);
    onUpload?.(isValidUrl(url) ? url : null);
  };

  return (
    <div style={{ marginBottom: 4 }}>

      {/* Preview da imagem */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 160,
        borderRadius: 12,
        border: '2px dashed var(--gray-200)',
        background: 'var(--gray-50)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        transition: 'border-color .2s',
      }}>
        {preview && isValidUrl(preview) ? (
          <>
            <img
              src={preview}
              alt="Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setPreview(null)}
            />
            {!uploading && (
              <button
                onClick={handleRemove}
                title="Remover imagem"
                style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(220,38,38,.9)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-body)',
                }}>✕</button>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>🖼️</div>
            <div style={{ fontSize: 12 }}>Nenhuma imagem</div>
          </div>
        )}

        {/* Barra de progresso */}
        {uploading && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 4, background: 'var(--gray-200)',
          }}>
            <div style={{
              height: '100%', background: 'var(--grape)',
              width: `${progress}%`, transition: 'width .3s',
            }} />
          </div>
        )}
      </div>

      {/* Botão de upload de arquivo */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={uploading}
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          className="btn-secondary"
          style={{ flex: 1, fontSize: 13 }}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? `Enviando... ${progress}%` : '📁 Selecionar arquivo'}
        </button>
      </div>

      {/* Input de URL manual como alternativa */}
      <div>
        <label style={{ fontSize: 11, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>
          Ou cole uma URL de imagem:
        </label>
        <input
          className="form-input"
          style={{ fontSize: 13, padding: '8px 12px' }}
          placeholder="https://..."
          defaultValue={currentUrl || ''}
          onChange={handleUrlInput}
          disabled={uploading}
        />
      </div>

      {/* Erro */}
      {uploadErr && (
        <div style={{
          marginTop: 6, padding: '8px 12px', borderRadius: 8,
          background: 'var(--red-pale)', border: '1px solid #FECACA',
          fontSize: 12, color: 'var(--red)', fontWeight: 600,
        }}>
          ⚠️ {uploadErr}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 6 }}>
        JPEG, PNG, WebP ou GIF · Máx. 5 MB
      </div>
    </div>
  );
}
