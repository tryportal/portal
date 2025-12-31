"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: number
    min: number
    max: number
    step: number
    onValueChange?: (value: number) => void
    labels?: number[]
    formatLabel?: (value: number) => React.ReactNode
    labelClassName?: string
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ className, value, min, max, step, onValueChange, labels, formatLabel = (v) => v, labelClassName, ...props }, ref) => {
        const getPercent = React.useCallback(
            (v: number) => ((v - min) / (max - min)) * 100,
            [min, max]
        )

        return (
            <div className={cn("relative w-full pt-2 px-1", className)}>
                <input
                    ref={ref}
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onValueChange?.(Number(e.target.value))}
                    className={cn(
                        "w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110",
                        "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
                    )}
                    {...props}
                />

                {labels && labels.length > 0 && (
                    <div className={cn("relative h-4 mt-4 text-[10px] font-bold text-muted-foreground/60 select-none", labelClassName)}>
                        {labels.map((labelVal) => {
                            const percent = getPercent(labelVal)
                            return (
                                <span
                                    key={labelVal}
                                    className={cn(
                                        "absolute top-0 -translate-x-1/2 transition-colors",
                                        value === labelVal && "text-primary font-bold"
                                    )}
                                    style={{ left: `calc(${percent}% + ${8 - (percent / 100) * 16}px)` }}
                                >
                                    {formatLabel(labelVal)}
                                </span>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }
)
Slider.displayName = "Slider"

export { Slider }
