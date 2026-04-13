// @ts-nocheck
import type { ImagesTabProps } from "./types";

export function ImagesTab({
  imgPrompt,
  setImgPrompt,
  imgStyle,
  setImgStyle,
  handleImageGenerate,
  imgLoading,
  imgResult,
  jimboOnline,
  jimboResponse,
  imageList,
  altTextLoading,
  handleGenerateAltText,
}: ImagesTabProps) {
  return (
    <div className="tab-content">
      <h2>
        🖼️ AI Image Generation{" "}
        <span className={`dot ${jimboOnline ? "online" : "offline"}`} />
      </h2>
      <section className="card">
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Prompt</label>
            <textarea
              value={imgPrompt}
              onChange={(e) => setImgPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Style</label>
            <select
              value={imgStyle}
              onChange={(e) => setImgStyle(e.target.value)}
            >
              <option value="">Default</option>
              <option value="photorealistic">Photorealistic</option>
              <option value="digital art">Digital Art</option>
              <option value="anime">Anime</option>
              <option value="oil painting">Oil Painting</option>
              <option value="watercolor">Watercolor</option>
              <option value="3d render">3D Render</option>
            </select>
          </div>
          <div className="form-group">
            <button
              className="btn-primary"
              onClick={handleImageGenerate}
              disabled={imgLoading}
            >
              {imgLoading ? "Generating..." : "Generate Image"}
            </button>
            <button
              className="btn-sm"
              onClick={() =>
                handleGenerateAltText("generated-image.png", imgPrompt)
              }
              disabled={altTextLoading}
              style={{ marginTop: 8 }}
            >
              {altTextLoading ? "..." : "Generuj opis"}
            </button>
          </div>
        </div>
      </section>
      {imgResult && (
        <section className="card">
          <h3>Result</h3>
          <div className="ai-output">
            <pre>{JSON.stringify(imgResult, null, 2)}</pre>
          </div>
        </section>
      )}
      {(jimboResponse || imageList?.length > 0) && (
        <section className="card">
          {jimboResponse && (
            <div className="ai-output">
              <pre>{jimboResponse}</pre>
            </div>
          )}
          {imageList?.length > 0 && (
            <p className="muted">Obrazy w kolejce/list: {imageList.length}</p>
          )}
        </section>
      )}
    </div>
  );
}
