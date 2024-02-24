import { Tooltip as BsTooltip } from "bootstrap"
import React, { useEffect, useRef } from "react"

export const Tooltip = (p: {children: JSX.Element, text: string}) => {
    const childRef = useRef(undefined as unknown as Element)

    useEffect(() => {
        const t = new BsTooltip(childRef.current, {
            title: p.text,
            container: 'body',
            trigger: 'hover',
        })
        return () => t.dispose()
    }, [p.text])

    return React.cloneElement(p.children, { ref: childRef })
}