import { Router, type Request, type Response } from "express";
import { PiBridge } from "../core/pi-bridge.js";

const router = Router();
const piBridge = new PiBridge();

router.post("/task", async (req: Request, res: Response) => {
  try {
    const taskId = await piBridge.receiveTask(req.body);
    res.json({ success: true, taskId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

router.get("/result/:taskId", async (req: Request, res: Response) => {
  try {
    const result = await piBridge.getResultForPi(req.params["taskId"]);
    res.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(404).json({ success: false, error: message });
  }
});

router.get("/status/:taskId", async (req: Request, res: Response) => {
  try {
    const status = await piBridge.getTaskStatus(req.params["taskId"]);
    res.json({ success: true, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(404).json({ success: false, error: message });
  }
});

export default router;
