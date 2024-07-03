const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Shop = require("../model/shop");
const ErrorHandler = require("../utils/ErrorHandler");
const { isSeller } = require("../middleware/auth");
const CoupounCode = require("../model/coupounCode");
const router = express.Router();

// create coupoun code
// router.post(
//   "/create-coupon-code",
//   isSeller,
//   catchAsyncErrors(async (req, res, next) => {
//     try {
//       const isCoupounCodeExists = await CoupounCode.find({
//         name: req.body.name,
//       });

//       if (isCoupounCodeExists.length !== 0) {
//         return next(new ErrorHandler("Mã giảm giá đã tồn tại!", 400));
//       }

//       req.body.remainingQuantity = 0;

//       const coupounCode = await CoupounCode.create(req.body);

//       res.status(201).json({
//         success: true,
//         coupounCode,
//       });
//     } catch (error) {
//       return next(new ErrorHandler(error, 400));
//     }
//   })
// );

router.post(
  "/create-coupon-code",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const isCoupounCodeExists = await CoupounCode.find({
        name: req.body.name,
      });

      if (isCoupounCodeExists.length !== 0) {
        return next(new ErrorHandler("Mã giảm giá đã tồn tại!", 400));
      }

      req.body.remainingQuantity = 0;

      const coupounCode = await CoupounCode.create(req.body);

      res.status(201).json({
        success: true,
        coupounCode,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
// get all coupons of a shop

router.get(
  "/get-coupon/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const couponCodes = await CoupounCode.find({ shopId: req.seller.id });
      res.status(201).json({
        success: true,
        couponCodes,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// delete coupoun code of a shop
router.delete(
  "/delete-coupon/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const couponCode = await CoupounCode.findByIdAndDelete(req.params.id);

      if (!couponCode) {
        return next(new ErrorHandler("Mã giảm giá không tồn tại!", 400));
      }
      res.status(201).json({
        success: true,
        message: "Đã xóa mã giảm giá thành công!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get coupon code value by its name
router.get(
  "/get-coupon-value/:name",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const couponCode = await CoupounCode.findOne({ name: req.params.name });

      res.status(200).json({
        success: true,
        couponCode,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);
// router.get(
//   "/get-coupon-value/:name",
//   catchAsyncErrors(async (req, res, next) => {
//     try {
//       const couponCode = await CoupounCode.findOne({ name: req.params.name });

//       if (!couponCode) {
//         return next(new ErrorHandler("Mã Voucher này không tồn tại!", 400));
//       }

//       // Kiểm tra xem số lượng mã giảm giá còn lại có đủ để sử dụng không.
//       if (couponCode.remainingQuantity >= couponCode.quantity) {
//         return next(new ErrorHandler("Mã giảm giá đã hết22!", 400));
//       }

//       // Nếu có đủ số lượng, cập nhật trường usedQuantity và lưu vào cơ sở dữ liệu.
//       couponCode.remainingQuantity += 1;
//       await couponCode.save();

//       res.status(200).json({
//         success: true,
//         couponCode,
//       });
//     } catch (error) {
//       return next(new ErrorHandler(error, 400));
//     }
//   })
// );

// // Đoạn mã xử lý cập nhật số lượng còn lại
// Cập nhật remainingQuantity của mã giảm giá
// Cập nhật remainingQuantity của mã giảm giá
router.put(
  "/update-coupon-quantity/:name",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const couponCode = await CoupounCode.findOne({ name: req.params.name });

      if (!couponCode) {
        return next(new ErrorHandler("Mã giảm giá không tồn tại", 400));
      }

      // Kiểm tra xem số lượng còn lại có đủ để sử dụng không.
      if (couponCode.remainingQuantity - couponCode.quantity === 0) {
        return next(new ErrorHandler("Mã giảm giá đã hết!", 400));
      }

      // Nếu có đủ số lượng, cập nhật trường remainingQuantity và lưu vào cơ sở dữ liệu.
      couponCode.remainingQuantity += 1;
      await couponCode.save();

      res.status(200).json({
        success: true,
        message: "Cập nhật số lượng mã giảm giá thành công!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

module.exports = router;
