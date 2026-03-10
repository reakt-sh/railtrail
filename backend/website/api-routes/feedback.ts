import { Prisma } from "@prisma/client";
import * as logging from "loglevel";
import { Feedback } from "schema-gen/feedback";
import { apiRouter } from "../api";
import { authOperatorGuard } from "../auth";
import { db } from "../db";
import checkWithSchema from "../validate";

const logger = logging.getLogger("api:feedback");

apiRouter.get("/feedback/list/:year", authOperatorGuard, async (req, res) => {
    const year = parseInt(req.params.year, 10);
    if (isNaN(year)) {
        res.status(400).send({ error: "Invalid year parameter" }).end();
        return;
    }
    const allFeedback = await db.feedback.findMany({
        where: { timestamp: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
        } },
        orderBy: { timestamp: "desc" }
    });
    const list: Feedback[] = allFeedback.map((entry) => {
        const data = entry.data as unknown as Feedback;
        return {
            rating: data.rating,
            text: data.text,
            vehicle: entry.vehicleId || undefined,
            timestamp: entry.timestamp.toISOString(),
        } as Feedback;
    });
    res.send(list).end();
});


apiRouter.post("/feedback/submit", async (req, res) => {
    const feedback: Feedback = req.body;
    const validationErrors = checkWithSchema("feedback", feedback);
    if (validationErrors) {
        res.status(400).send(validationErrors).end();
    } else {
        let vehicleId = 0;

        // Check if vehicle exists if provided
        if (feedback.vehicle && feedback.vehicle > 0) {
            const vehicle = await db.vehicle.findUnique({ where: { uid: feedback.vehicle } });
            if (vehicle) {
                vehicleId = vehicle.uid;
            }
        }

        // Save new entry
        const dbEntry = await db.feedback.create({
            data: {
                timestamp: new Date(),
                data: feedback as unknown as Prisma.InputJsonValue,
                vehicleId: vehicleId > 0 ? vehicleId : null,
            }
        });
        if (!dbEntry) {
            logger.error("Failed to create new feedback entry");
        }

        // Confirm
        res.status(200).end();
    }
});
