package com.deadZone.shooterserver.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {

    @GetMapping({
            "/auth",
            "/login",
            "/register",
            "/menu",
            "/my-player",
            "/settings",
            "/rooms",
            "/rooms/new",
            "/game"
    })
    public String forwardClientRoutes() {
        return "forward:/index.html";
    }
}
