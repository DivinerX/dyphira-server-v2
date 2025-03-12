import { Click } from "@/models/click";
import { Fund } from "@/models/fund";
import { User } from "@/models/user";
import { Request, RequestHandler, Response } from "express";
import type { JwtPayload } from 'jsonwebtoken';

export const getClicks = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as JwtPayload)._id;
    const user = await User.findById(userId).populate('fund');
    const click = await Click.findOne({ referralCode: user?.fund.referralCode });
    if (!click) {
      return res.status(404).json({ message: "Click not found" });
    }
    else {
      return res.status(200).json(click);
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error fetching click:", error });
  }
}

export const addClick: RequestHandler = async (req, res) => {
  try {
    const { referralCode } = req.body;
    const fund = await Fund.findOne({ referralCode });
    if (!fund) return res.status(404).json({ message: 'Invalid referral code' });
    
    let click = await Click.findOne({ referralCode });
    if (!click) {
      click = new Click({ referralCode, clicks: [new Date()] });
    } else {
      click.clicks = [...click.clicks, new Date()];
    }
    await click.save();

    return res.status(200).json({
      message: 'Click added successfully',
      clicks: click.clicks.length
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error adding click', error: error });
  }
};